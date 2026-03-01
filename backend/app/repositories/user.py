from typing import Optional, List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.user import User
from app.repositories.base import BaseRepository
import uuid


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_verification_token(self, token: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.verification_token == token)
        )
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(User).where(User.email == email.lower())
        )
        return result.scalar_one() > 0

    async def get_active_users(self, skip: int = 0, limit: int = 20) -> Sequence[User]:
        result = await self.db.execute(
            select(User).where(User.is_active == True).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def search_users(self, query: str, skip: int = 0, limit: int = 20) -> Sequence[User]:
        result = await self.db.execute(
            select(User)
            .where(
                or_(
                    User.email.ilike(f"%{query}%"),
                    User.full_name.ilike(f"%{query}%"),
                    User.company_name.ilike(f"%{query}%"),
                )
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_with_sites(self) -> int:
        from app.models.site import Site
        from sqlalchemy import distinct
        result = await self.db.execute(
            select(func.count(distinct(Site.owner_id)))
        )
        return result.scalar_one()


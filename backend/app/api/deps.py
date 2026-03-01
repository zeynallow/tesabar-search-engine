from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.redis_client import get_redis, CacheManager
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user import UserRepository
from app.core.exceptions import CREDENTIALS_EXCEPTION, PERMISSION_EXCEPTION
from typing import Annotated

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise CREDENTIALS_EXCEPTION

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise CREDENTIALS_EXCEPTION

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(payload["sub"])
    if not user or not user.is_active:
        raise CREDENTIALS_EXCEPTION

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise PERMISSION_EXCEPTION
    return current_user


async def get_cache(redis=Depends(get_redis)) -> CacheManager:
    return CacheManager(redis)


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]
Cache = Annotated[CacheManager, Depends(get_cache)]


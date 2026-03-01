from typing import Optional, List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from app.models.site import Site, SitemapEntry, SiteStatus, SitemapStatus, SitemapSource
from app.repositories.base import BaseRepository
import uuid


class SiteRepository(BaseRepository[Site]):
    def __init__(self, db: AsyncSession):
        super().__init__(Site, db)

    async def get_by_domain(self, domain: str) -> Optional[Site]:
        result = await self.db.execute(
            select(Site).where(Site.domain == domain.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Sequence[Site]:
        result = await self.db.execute(
            select(Site)
            .where(Site.owner_id == owner_id)
            .order_by(Site.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def count_by_owner(self, owner_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Site).where(Site.owner_id == owner_id)
        )
        return result.scalar_one()

    async def get_active_sites(self, skip: int = 0, limit: int = 50) -> Sequence[Site]:
        result = await self.db.execute(
            select(Site)
            .where(and_(Site.status == SiteStatus.ACTIVE, Site.is_domain_verified == True))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def domain_exists(self, domain: str) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(Site).where(Site.domain == domain.lower())
        )
        return result.scalar_one() > 0

    async def increment_stats(self, site_id: uuid.UUID, pages_indexed: int = 0, pages_crawled: int = 0, pages_with_issues: int = 0):
        await self.db.execute(
            update(Site)
            .where(Site.id == site_id)
            .values(
                total_pages_indexed=Site.total_pages_indexed + pages_indexed,
                total_pages_crawled=Site.total_pages_crawled + pages_crawled,
                total_pages_with_issues=Site.total_pages_with_issues + pages_with_issues,
            )
        )

    async def get_all_for_admin(self, skip: int = 0, limit: int = 20, status: Optional[SiteStatus] = None) -> Sequence[Site]:
        q = select(Site).order_by(Site.created_at.desc())
        if status:
            q = q.where(Site.status == status)
        result = await self.db.execute(q.offset(skip).limit(limit))
        return result.scalars().all()

    async def count_by_status(self, status: SiteStatus) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Site).where(Site.status == status)
        )
        return result.scalar_one()

    async def get_popular(self, limit: int = 6) -> Sequence[Site]:
        """Return active sites ordered by total_pages_indexed descending."""
        result = await self.db.execute(
            select(Site)
            .where(Site.status == SiteStatus.ACTIVE)
            .order_by(Site.total_pages_indexed.desc())
            .limit(limit)
        )
        return result.scalars().all()


class SitemapRepository(BaseRepository[SitemapEntry]):
    def __init__(self, db: AsyncSession):
        super().__init__(SitemapEntry, db)

    async def get_by_site(self, site_id: uuid.UUID) -> Sequence[SitemapEntry]:
        result = await self.db.execute(
            select(SitemapEntry)
            .where(SitemapEntry.site_id == site_id)
            .order_by(SitemapEntry.created_at.desc())
        )
        return result.scalars().all()

    async def url_exists_for_site(self, site_id: uuid.UUID, url: str) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(SitemapEntry)
            .where(and_(SitemapEntry.site_id == site_id, SitemapEntry.url == url))
        )
        return result.scalar_one() > 0

    async def get_pending_sitemaps(self, limit: int = 50) -> Sequence[SitemapEntry]:
        result = await self.db.execute(
            select(SitemapEntry)
            .where(and_(SitemapEntry.status == SitemapStatus.PENDING, SitemapEntry.is_active == True))
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_site_and_source(self, site_id: uuid.UUID, source: SitemapSource) -> Sequence[SitemapEntry]:
        result = await self.db.execute(
            select(SitemapEntry)
            .where(and_(SitemapEntry.site_id == site_id, SitemapEntry.source == source))
        )
        return result.scalars().all()


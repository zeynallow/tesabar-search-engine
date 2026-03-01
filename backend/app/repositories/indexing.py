from typing import Optional, List, Sequence, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update, or_
from app.models.indexing import IndexedPage, Product, IndexingJob, PageStatus, PageType, JobStatus
from app.repositories.base import BaseRepository
import uuid


class IndexedPageRepository(BaseRepository[IndexedPage]):
    def __init__(self, db: AsyncSession):
        super().__init__(IndexedPage, db)

    async def get_by_url(self, site_id: uuid.UUID, url: str) -> Optional[IndexedPage]:
        result = await self.db.execute(
            select(IndexedPage).where(
                and_(IndexedPage.site_id == site_id, IndexedPage.url == url)
            )
        )
        return result.scalar_one_or_none()

    async def get_by_site(self, site_id: uuid.UUID, skip: int = 0, limit: int = 20,
                          status: Optional[PageStatus] = None,
                          page_type: Optional[PageType] = None) -> Sequence[IndexedPage]:
        q = select(IndexedPage).where(IndexedPage.site_id == site_id)
        if status:
            q = q.where(IndexedPage.status == status)
        if page_type:
            q = q.where(IndexedPage.page_type == page_type)
        q = q.order_by(IndexedPage.last_crawled_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count_by_site(self, site_id: uuid.UUID, status: Optional[PageStatus] = None) -> int:
        q = select(func.count()).select_from(IndexedPage).where(IndexedPage.site_id == site_id)
        if status:
            q = q.where(IndexedPage.status == status)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def get_pages_with_issues(self, site_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Sequence[IndexedPage]:
        result = await self.db.execute(
            select(IndexedPage)
            .where(and_(IndexedPage.site_id == site_id, IndexedPage.seo_issues.isnot(None)))
            .offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_pending_for_crawl(self, limit: int = 100) -> Sequence[IndexedPage]:
        result = await self.db.execute(
            select(IndexedPage)
            .where(IndexedPage.status == PageStatus.PENDING)
            .order_by(IndexedPage.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def count_issues_by_type(self, site_id: uuid.UUID) -> Dict[str, int]:
        result = await self.db.execute(
            select(IndexedPage.seo_issues)
            .where(and_(IndexedPage.site_id == site_id, IndexedPage.seo_issues.isnot(None)))
        )
        issues_count: Dict[str, int] = {}
        for row in result.scalars().all():
            if isinstance(row, list):
                for issue in row:
                    if isinstance(issue, dict):
                        t = issue.get("type", "unknown")
                        issues_count[t] = issues_count.get(t, 0) + 1
        return issues_count

    async def pages_by_type_count(self, site_id: uuid.UUID) -> Dict[str, int]:
        result = await self.db.execute(
            select(IndexedPage.page_type, func.count())
            .where(IndexedPage.site_id == site_id)
            .group_by(IndexedPage.page_type)
        )
        return {row[0].value: row[1] for row in result.all()}

    async def url_exists(self, site_id: uuid.UUID, url: str) -> bool:
        result = await self.db.execute(
            select(func.count()).select_from(IndexedPage)
            .where(and_(IndexedPage.site_id == site_id, IndexedPage.url == url))
        )
        return result.scalar_one() > 0


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: AsyncSession):
        super().__init__(Product, db)

    async def get_by_page(self, page_id: uuid.UUID) -> Optional[Product]:
        result = await self.db.execute(
            select(Product).where(Product.page_id == page_id)
        )
        return result.scalar_one_or_none()

    async def get_by_site(self, site_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Sequence[Product]:
        result = await self.db.execute(
            select(Product).where(Product.site_id == site_id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def count_by_site(self, site_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Product).where(Product.site_id == site_id)
        )
        return result.scalar_one()

    async def get_not_es_indexed(self, limit: int = 500) -> Sequence[Product]:
        result = await self.db.execute(
            select(Product).where(Product.es_indexed == False).limit(limit)
        )
        return result.scalars().all()

    async def mark_es_indexed(self, product_ids: List[uuid.UUID]):
        await self.db.execute(
            update(Product).where(Product.id.in_(product_ids)).values(es_indexed=True)
        )


class IndexingJobRepository(BaseRepository[IndexingJob]):
    def __init__(self, db: AsyncSession):
        super().__init__(IndexingJob, db)

    async def get_by_site(self, site_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Sequence[IndexingJob]:
        result = await self.db.execute(
            select(IndexingJob)
            .where(IndexingJob.site_id == site_id)
            .order_by(IndexingJob.created_at.desc())
            .offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def count_running(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(IndexingJob).where(IndexingJob.status == JobStatus.RUNNING)
        )
        return result.scalar_one()

    async def count_queued(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(IndexingJob).where(IndexingJob.status == JobStatus.QUEUED)
        )
        return result.scalar_one()


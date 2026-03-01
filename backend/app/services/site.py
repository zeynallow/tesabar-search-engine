from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.models.site import Site, SitemapEntry, SiteStatus, SitemapSource, SitemapStatus
from app.models.user import User
from app.repositories.site import SiteRepository, SitemapRepository
from app.repositories.indexing import IndexedPageRepository, ProductRepository
from app.core.security import generate_verification_token
from app.core.exceptions import (
    NotFoundError, AlreadyExistsError, PermissionDeniedError, DomainVerificationError
)
from app.schemas.console.sites import SiteCreateRequest, SiteUpdateRequest, SiteStatsResponse
from app.schemas.console.sitemaps import SitemapAddRequest
import structlog
import uuid

logger = structlog.get_logger()


class SiteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.site_repo = SiteRepository(db)
        self.sitemap_repo = SitemapRepository(db)
        self.page_repo = IndexedPageRepository(db)
        self.product_repo = ProductRepository(db)

    async def register_site(self, data: SiteCreateRequest, owner: User) -> Site:
        if await self.site_repo.domain_exists(data.domain):
            raise AlreadyExistsError("Site", "domain")

        verification_token = generate_verification_token()
        site = Site(
            owner_id=owner.id,
            domain=data.domain.lower(),
            name=data.name,
            description=data.description,
            status=SiteStatus.PENDING,
            verification_token=verification_token,
            verification_method="dns_txt",
        )
        site = await self.site_repo.create(site)
        logger.info("Site registered", site_id=str(site.id), domain=site.domain)
        return site

    async def get_site(self, site_id: uuid.UUID, owner: User) -> Site:
        site = await self.site_repo.get_by_id(site_id)
        if not site:
            raise NotFoundError("Site", site_id)
        if not owner.is_admin and site.owner_id != owner.id:
            raise PermissionDeniedError()
        return site

    async def update_site(self, site_id: uuid.UUID, data: SiteUpdateRequest, owner: User) -> Site:
        site = await self.get_site(site_id, owner)
        update_data = data.model_dump(exclude_none=True)
        return await self.site_repo.update(site, **update_data)

    async def delete_site(self, site_id: uuid.UUID, owner: User) -> None:
        site = await self.get_site(site_id, owner)
        await self.site_repo.delete(site)

    async def get_verification_details(self, site_id: uuid.UUID, owner: User) -> dict:
        site = await self.get_site(site_id, owner)
        token = site.verification_token
        return {
            "dns_txt": {
                "method": "dns_txt",
                "record_type": "TXT",
                "record_name": f"_tesabar-verify.{site.domain}",
                "record_value": f"tesabar-site-verification={token}",
                "instructions": f"Add a TXT record to your DNS: _tesabar-verify.{site.domain} → tesabar-site-verification={token}",
            },
            "meta_tag": {
                "method": "meta_tag",
                "tag": f'<meta name="tesabar-site-verification" content="{token}" />',
                "instructions": "Add this meta tag to the <head> of your homepage",
            },
        }

    async def verify_domain(self, site_id: uuid.UUID, method: str, owner: User) -> Site:
        site = await self.get_site(site_id, owner)
        if site.is_domain_verified:
            return site
        # Actual DNS/meta verification would happen here via crawler
        # For now we queue a verification job
        from app.workers.tasks import verify_site_domain_task
        verify_site_domain_task.delay(str(site.id), method)
        return site

    async def get_sites(self, owner: User, skip: int = 0, limit: int = 20) -> List[Site]:
        if owner.is_admin:
            return list(await self.site_repo.get_all(skip=skip, limit=limit))
        return list(await self.site_repo.get_by_owner(owner.id, skip=skip, limit=limit))

    async def get_site_stats(self, site_id: uuid.UUID, owner: User) -> SiteStatsResponse:
        site = await self.get_site(site_id, owner)
        total_products = await self.product_repo.count_by_site(site_id)
        total_crawled = site.total_pages_crawled or 1
        issues_by_type = await self.page_repo.count_issues_by_type(site_id)
        pages_by_type = await self.page_repo.pages_by_type_count(site_id)
        crawl_errors = await self.page_repo.count_by_site(site_id)

        return SiteStatsResponse(
            site_id=site.id,
            domain=site.domain,
            total_pages_indexed=site.total_pages_indexed,
            total_pages_crawled=site.total_pages_crawled,
            total_pages_with_issues=site.total_pages_with_issues,
            total_products=total_products,
            index_coverage_percent=round((site.total_pages_indexed / total_crawled) * 100, 2),
            last_crawled_at=site.last_crawled_at,
            issues_by_type=issues_by_type,
            crawl_errors_count=crawl_errors,
            pages_by_type=pages_by_type,
        )

    async def add_sitemap(self, site_id: uuid.UUID, data: SitemapAddRequest, owner: User,
                          source: SitemapSource = SitemapSource.CONSOLE) -> SitemapEntry:
        site = await self.get_site(site_id, owner)
        if await self.sitemap_repo.url_exists_for_site(site_id, data.url):
            raise AlreadyExistsError("Sitemap URL")

        # Validate domain ownership
        if source == SitemapSource.CONSOLE:
            from urllib.parse import urlparse
            parsed = urlparse(data.url)
            if site.domain not in parsed.netloc:
                raise PermissionDeniedError("Sitemap must belong to your domain")

        entry = SitemapEntry(
            site_id=site_id,
            url=data.url,
            source=source,
            status=SitemapStatus.PENDING,
        )
        entry = await self.sitemap_repo.create(entry)

        # Queue sitemap fetch job
        from app.workers.tasks import fetch_sitemap_task
        fetch_sitemap_task.delay(str(entry.id))
        logger.info("Sitemap added", sitemap_id=str(entry.id), url=data.url)
        return entry

    async def get_sitemaps(self, site_id: uuid.UUID, owner: User) -> List[SitemapEntry]:
        await self.get_site(site_id, owner)
        return list(await self.sitemap_repo.get_by_site(site_id))


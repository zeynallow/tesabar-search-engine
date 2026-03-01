from fastapi import APIRouter, Query
from typing import Optional, List
from app.api.deps import CurrentAdmin, DB
from app.schemas.admin.sites import (
    AdminSiteListResponse, AdminSiteUpdateRequest, AdminAddSitemapRequest,
    AdminSiteDetailResponse, SystemStatsResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.console.sitemaps import SitemapResponse
from app.services.site import SiteService
from app.repositories.site import SiteRepository, SitemapRepository
from app.repositories.indexing import IndexedPageRepository, ProductRepository, IndexingJobRepository
from app.repositories.user import UserRepository
from app.repositories.ads import AdCampaignRepository
from app.models.site import SiteStatus, SitemapSource
from app.models.indexing import JobStatus
from app.schemas.console.sitemaps import SitemapAddRequest
from app.core.exceptions import NotFoundError
import uuid

router = APIRouter(prefix="/sites", tags=["Admin - Sites"])


@router.get("", response_model=PaginatedResponse[AdminSiteListResponse])
async def list_all_sites(
    current_admin: CurrentAdmin,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[SiteStatus] = None,
):
    """List all sites across all users."""
    site_repo = SiteRepository(db)
    user_repo = UserRepository(db)
    sites = await site_repo.get_all_for_admin(skip=skip, limit=limit, status=status)
    total = await site_repo.count()

    items = []
    for site in sites:
        owner = await user_repo.get_by_id(site.owner_id)
        items.append(AdminSiteListResponse(
            id=site.id,
            domain=site.domain,
            name=site.name,
            owner_email=owner.email if owner else "unknown",
            status=site.status,
            is_domain_verified=site.is_domain_verified,
            total_pages_indexed=site.total_pages_indexed,
            total_pages_crawled=site.total_pages_crawled,
            last_crawled_at=site.last_crawled_at,
            created_at=site.created_at,
        ))
    return PaginatedResponse.create(items=items, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(current_admin: CurrentAdmin, db: DB):
    """Get overall system statistics."""
    site_repo = SiteRepository(db)
    user_repo = UserRepository(db)
    page_repo = IndexedPageRepository(db)
    product_repo = ProductRepository(db)
    job_repo = IndexingJobRepository(db)
    campaign_repo = AdCampaignRepository(db)

    total_sites = await site_repo.count()
    active_sites = await site_repo.count_by_status(SiteStatus.ACTIVE)
    total_users = await user_repo.count()
    total_indexed = await page_repo.count()
    total_products = await product_repo.count()
    active_campaigns = await campaign_repo.count_active()
    running_jobs = await job_repo.count_running()
    queued_jobs = await job_repo.count_queued()

    return SystemStatsResponse(
        total_sites=total_sites,
        active_sites=active_sites,
        total_pages_indexed=total_indexed,
        total_products_indexed=total_products,
        total_users=total_users,
        total_active_campaigns=active_campaigns,
        indexing_jobs_running=running_jobs,
        indexing_jobs_queued=queued_jobs,
        es_index_size_mb=0.0,
        search_queries_today=0,
    )


@router.get("/{site_id}", response_model=AdminSiteDetailResponse)
async def get_site_detail(site_id: uuid.UUID, current_admin: CurrentAdmin, db: DB):
    """Get detailed info about any site."""
    site_repo = SiteRepository(db)
    user_repo = UserRepository(db)
    site = await site_repo.get_by_id(site_id)
    if not site:
        raise NotFoundError("Site", site_id)
    owner = await user_repo.get_by_id(site.owner_id)
    return AdminSiteDetailResponse(
        id=site.id,
        domain=site.domain,
        name=site.name,
        description=site.description,
        owner_email=owner.email if owner else "unknown",
        owner_id=site.owner_id,
        status=site.status,
        is_domain_verified=site.is_domain_verified,
        total_pages_indexed=site.total_pages_indexed,
        total_pages_crawled=site.total_pages_crawled,
        total_pages_with_issues=site.total_pages_with_issues,
        last_crawled_at=site.last_crawled_at,
        created_at=site.created_at,
    )


@router.patch("/{site_id}", response_model=MessageResponse)
async def update_site_status(site_id: uuid.UUID, data: AdminSiteUpdateRequest, current_admin: CurrentAdmin, db: DB):
    """Update site status or verification from admin panel."""
    site_repo = SiteRepository(db)
    site = await site_repo.get_by_id(site_id)
    if not site:
        raise NotFoundError("Site", site_id)
    update_data = data.model_dump(exclude_none=True)
    await site_repo.update(site, **update_data)
    return MessageResponse(message="Site updated")


@router.post("/{site_id}/sitemaps", response_model=SitemapResponse, status_code=201)
async def admin_add_sitemap(site_id: uuid.UUID, data: AdminAddSitemapRequest, current_admin: CurrentAdmin, db: DB):
    """Admin can manually add a sitemap to any site (bypasses domain validation)."""
    site_repo = SiteRepository(db)
    sitemap_repo = SitemapRepository(db)
    site = await site_repo.get_by_id(site_id)
    if not site:
        raise NotFoundError("Site", site_id)

    from app.models.site import SitemapEntry, SitemapStatus
    entry = SitemapEntry(
        site_id=site_id,
        url=data.url,
        source=SitemapSource.ADMIN,
        status=SitemapStatus.PENDING,
    )
    entry = await sitemap_repo.create(entry)

    if data.trigger_fetch:
        from app.workers.tasks import fetch_sitemap_task
        fetch_sitemap_task.delay(str(entry.id))

    return SitemapResponse.model_validate(entry)


@router.post("/{site_id}/reindex", response_model=MessageResponse)
async def trigger_reindex(site_id: uuid.UUID, current_admin: CurrentAdmin, db: DB):
    """Trigger full re-crawl of all pages for a site."""
    site_repo = SiteRepository(db)
    site = await site_repo.get_by_id(site_id)
    if not site:
        raise NotFoundError("Site", site_id)

    from app.models.indexing import IndexingJob, JobStatus
    from app.repositories.indexing import IndexingJobRepository
    job_repo = IndexingJobRepository(db)
    job = IndexingJob(site_id=site_id, status=JobStatus.QUEUED, job_type="reindex")
    job = await job_repo.create(job)

    from app.workers.tasks import crawl_site_batch_task
    crawl_site_batch_task.delay(str(site_id), str(job.id))
    return MessageResponse(message="Reindex job queued")


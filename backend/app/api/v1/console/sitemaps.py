from fastapi import APIRouter, Query
from typing import List
from app.api.deps import CurrentUser, DB
from app.schemas.console.sitemaps import (
    SitemapAddRequest, SitemapResponse, SitemapTestResponse,
)
from app.schemas.common import MessageResponse
from app.services.site import SiteService
from app.services.sitemap_parser import fetch_and_parse_sitemap
from app.repositories.site import SitemapRepository
from app.core.exceptions import NotFoundError, PermissionDeniedError
import uuid

router = APIRouter(prefix="/sites/{site_id}/sitemaps", tags=["Console - Sitemaps"])


@router.post("", response_model=SitemapResponse, status_code=201)
async def add_sitemap(site_id: uuid.UUID, data: SitemapAddRequest, current_user: CurrentUser, db: DB):
    """Add a sitemap URL for a site. System will fetch and parse it automatically."""
    service = SiteService(db)
    entry = await service.add_sitemap(site_id, data, current_user)
    return SitemapResponse.model_validate(entry)


@router.get("", response_model=List[SitemapResponse])
async def list_sitemaps(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """List all sitemaps registered for a site."""
    service = SiteService(db)
    sitemaps = await service.get_sitemaps(site_id, current_user)
    return [SitemapResponse.model_validate(s) for s in sitemaps]


@router.delete("/{sitemap_id}", response_model=MessageResponse)
async def delete_sitemap(site_id: uuid.UUID, sitemap_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Remove a sitemap entry."""
    service = SiteService(db)
    # Verify ownership
    await service.get_site(site_id, current_user)
    sitemap_repo = SitemapRepository(db)
    sitemap = await sitemap_repo.get_by_id(sitemap_id)
    if not sitemap or sitemap.site_id != site_id:
        raise NotFoundError("Sitemap", sitemap_id)
    await sitemap_repo.delete(sitemap)
    return MessageResponse(message="Sitemap removed successfully")


@router.post("/{sitemap_id}/refetch", response_model=MessageResponse)
async def refetch_sitemap(site_id: uuid.UUID, sitemap_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Trigger a re-fetch of an existing sitemap."""
    service = SiteService(db)
    await service.get_site(site_id, current_user)
    sitemap_repo = SitemapRepository(db)
    sitemap = await sitemap_repo.get_by_id(sitemap_id)
    if not sitemap or sitemap.site_id != site_id:
        raise NotFoundError("Sitemap", sitemap_id)

    from app.workers.tasks import fetch_sitemap_task
    from app.models.site import SitemapStatus
    await sitemap_repo.update(sitemap, status=SitemapStatus.PENDING)
    fetch_sitemap_task.delay(str(sitemap_id))
    return MessageResponse(message="Sitemap re-fetch queued")


@router.post("/test", response_model=SitemapTestResponse)
async def test_sitemap_url(data: SitemapAddRequest, current_user: CurrentUser):
    """Test a sitemap URL before adding it - validates format and lists sample URLs."""
    result = await fetch_and_parse_sitemap(data.url, max_urls=20)
    return SitemapTestResponse(
        url=data.url,
        is_valid=not bool(result.error),
        url_count=result.url_count,
        detected_type=result.detected_type,
        sample_urls=result.urls[:10],
        error=result.error,
    )


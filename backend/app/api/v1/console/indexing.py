from fastapi import APIRouter, Query
from typing import List, Optional
from app.api.deps import CurrentUser, DB
from app.schemas.console.indexing import (
    IndexedPageResponse, IndexingJobResponse, PageIssuesReport,
    RequestIndexingRequest, SEOIssue,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.site import SiteService
from app.repositories.indexing import IndexedPageRepository, IndexingJobRepository
from app.models.indexing import PageStatus, PageType
import uuid

router = APIRouter(prefix="/sites/{site_id}/indexing", tags=["Console - Indexing"])


@router.get("/pages", response_model=PaginatedResponse[IndexedPageResponse])
async def list_indexed_pages(
    site_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[PageStatus] = None,
    page_type: Optional[PageType] = None,
):
    """List all indexed pages for a site with filtering options."""
    service = SiteService(db)
    await service.get_site(site_id, current_user)

    page_repo = IndexedPageRepository(db)
    pages = await page_repo.get_by_site(site_id, skip=skip, limit=limit, status=status, page_type=page_type)
    total = await page_repo.count_by_site(site_id, status=status)

    items = [IndexedPageResponse.model_validate(p) for p in pages]
    return PaginatedResponse.create(items=items, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/pages/{page_id}", response_model=IndexedPageResponse)
async def get_indexed_page(site_id: uuid.UUID, page_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get details of a specific indexed page including SEO issues."""
    service = SiteService(db)
    await service.get_site(site_id, current_user)

    page_repo = IndexedPageRepository(db)
    page = await page_repo.get_by_id(page_id)
    if not page or page.site_id != site_id:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Page", page_id)
    return IndexedPageResponse.model_validate(page)


@router.get("/issues", response_model=PageIssuesReport)
async def get_issues_report(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get SEO issues report for the site - similar to Google Search Console coverage report."""
    service = SiteService(db)
    await service.get_site(site_id, current_user)

    page_repo = IndexedPageRepository(db)
    issues_by_type = await page_repo.count_issues_by_type(site_id)
    pages_with_issues = await page_repo.get_pages_with_issues(site_id, skip=0, limit=5)

    total_issues = sum(issues_by_type.values())
    errors = sum(v for k, v in issues_by_type.items() if "missing" in k or "noindex" in k)
    warnings = sum(v for k, v in issues_by_type.items() if "too_" in k or "multiple" in k)
    infos = total_issues - errors - warnings

    sample_issues = []
    for page in pages_with_issues:
        if page.seo_issues:
            for issue in page.seo_issues[:2]:
                sample_issues.append(SEOIssue(
                    type=issue.get("type", ""),
                    severity=issue.get("severity", "info"),
                    message=issue.get("message", ""),
                    affected_url=page.url,
                    recommendation=issue.get("recommendation"),
                ))

    return PageIssuesReport(
        site_id=site_id,
        total_issues=total_issues,
        errors=errors,
        warnings=warnings,
        infos=infos,
        issues_by_type=issues_by_type,
        affected_pages=len(pages_with_issues),
        sample_issues=sample_issues[:10],
    )


@router.post("/request", response_model=MessageResponse)
async def request_indexing(site_id: uuid.UUID, data: RequestIndexingRequest, current_user: CurrentUser, db: DB):
    """Request immediate indexing of specific URLs (like Google Search Console URL inspection)."""
    service = SiteService(db)
    site = await service.get_site(site_id, current_user)

    from app.workers.tasks import crawl_url_task
    from urllib.parse import urlparse

    queued = 0
    for url in data.urls:
        parsed = urlparse(url)
        if site.domain not in parsed.netloc:
            continue
        crawl_url_task.delay(str(site_id), url)
        queued += 1

    return MessageResponse(message=f"{queued} URL(s) queued for indexing")


@router.get("/jobs", response_model=List[IndexingJobResponse])
async def list_indexing_jobs(
    site_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
):
    """List indexing job history for a site."""
    service = SiteService(db)
    await service.get_site(site_id, current_user)

    job_repo = IndexingJobRepository(db)
    jobs = await job_repo.get_by_site(site_id, skip=skip, limit=limit)
    return [IndexingJobResponse.model_validate(j) for j in jobs]


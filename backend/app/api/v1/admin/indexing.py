from fastapi import APIRouter, Query, BackgroundTasks
from typing import Optional
from app.api.deps import CurrentAdmin, DB
from app.schemas.console.indexing import IndexingJobResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.repositories.indexing import IndexingJobRepository, IndexedPageRepository, ProductRepository
from app.models.indexing import JobStatus
import uuid

router = APIRouter(prefix="/indexing", tags=["Admin - Indexing"])


@router.get("/jobs", response_model=PaginatedResponse[IndexingJobResponse])
async def list_all_jobs(
    current_admin: CurrentAdmin,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[JobStatus] = None,
):
    """List all indexing jobs across all sites."""
    job_repo = IndexingJobRepository(db)
    jobs = await job_repo.get_all(skip=skip, limit=limit)
    total = await job_repo.count()

    if status:
        jobs = [j for j in jobs if j.status == status]
    items = [IndexingJobResponse.model_validate(j) for j in jobs]
    return PaginatedResponse.create(items=items, total=total, page=skip // limit + 1, page_size=limit)


@router.post("/bulk-index-es", response_model=MessageResponse)
async def trigger_bulk_es_index(current_admin: CurrentAdmin):
    """Manually trigger bulk Elasticsearch indexing of pending products."""
    from app.workers.tasks import bulk_index_es_task
    bulk_index_es_task.delay()
    return MessageResponse(message="Bulk ES indexing job queued")


@router.post("/update-ad-boosts", response_model=MessageResponse)
async def trigger_ad_boost_update(current_admin: CurrentAdmin):
    """Manually trigger ad boost score sync to Elasticsearch."""
    from app.workers.tasks import update_ad_boosts_task
    update_ad_boosts_task.delay()
    return MessageResponse(message="Ad boost update job queued")


from fastapi import APIRouter, Query
from typing import List, Optional
from app.api.deps import CurrentUser, DB
from app.schemas.console.sites import (
    SiteCreateRequest, SiteUpdateRequest, SiteResponse, SiteStatsResponse, SiteVerificationResponse,
)
from app.schemas.common import MessageResponse, PaginatedResponse
from app.services.site import SiteService
import uuid

router = APIRouter(prefix="/sites", tags=["Console - Sites"])


@router.post("", response_model=SiteResponse, status_code=201)
async def create_site(data: SiteCreateRequest, current_user: CurrentUser, db: DB):
    """Register a new site in the search console."""
    service = SiteService(db)
    site = await service.register_site(data, current_user)
    return SiteResponse.model_validate(site)


@router.get("", response_model=List[SiteResponse])
async def list_sites(
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all sites owned by current user."""
    service = SiteService(db)
    sites = await service.get_sites(current_user, skip=skip, limit=limit)
    return [SiteResponse.model_validate(s) for s in sites]


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get details of a specific site."""
    service = SiteService(db)
    site = await service.get_site(site_id, current_user)
    return SiteResponse.model_validate(site)


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(site_id: uuid.UUID, data: SiteUpdateRequest, current_user: CurrentUser, db: DB):
    """Update site metadata."""
    service = SiteService(db)
    site = await service.update_site(site_id, data, current_user)
    return SiteResponse.model_validate(site)


@router.delete("/{site_id}", response_model=MessageResponse)
async def delete_site(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Delete a site and all its data."""
    service = SiteService(db)
    await service.delete_site(site_id, current_user)
    return MessageResponse(message="Site deleted successfully")


@router.get("/{site_id}/stats", response_model=SiteStatsResponse)
async def get_site_stats(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get indexing statistics and coverage report for a site."""
    service = SiteService(db)
    return await service.get_site_stats(site_id, current_user)


@router.get("/{site_id}/verification", response_model=dict)
async def get_verification_options(site_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get domain verification instructions and tokens."""
    service = SiteService(db)
    return await service.get_verification_details(site_id, current_user)


@router.post("/{site_id}/verify", response_model=SiteResponse)
async def trigger_verification(
    site_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    method: str = Query("meta_tag", enum=["dns_txt", "meta_tag"]),
):
    """Trigger domain ownership verification check."""
    service = SiteService(db)
    site = await service.verify_domain(site_id, method, current_user)
    return SiteResponse.model_validate(site)


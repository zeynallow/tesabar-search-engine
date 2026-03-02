from fastapi import APIRouter, Query
from typing import List
from app.api.deps import CurrentUser, DB
from app.schemas.ads import (
    CampaignCreateRequest, CampaignUpdateRequest, CampaignResponse,
    AdGroupCreateRequest, AdGroupResponse,
    AdCreateRequest, AdUpdateRequest, AdResponse,
    CampaignStatsResponse, AdStatsResponse,
)
from app.schemas.common import MessageResponse
from app.services.ads import AdsService
from app.repositories.ads import AdCampaignRepository, AdGroupRepository, AdRepository
from app.core.exceptions import NotFoundError, PermissionDeniedError
import uuid

router = APIRouter(prefix="/sites/{site_id}/ads", tags=["Console - Ads"])


@router.post("/campaigns", response_model=CampaignResponse, status_code=201)
async def create_campaign(site_id: uuid.UUID, data: CampaignCreateRequest, current_user: CurrentUser, db: DB):
    """Create a new advertising campaign."""
    service = AdsService(db)
    campaign = await service.create_campaign(site_id, data, current_user)
    return CampaignResponse.model_validate(campaign)


@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    site_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all campaigns for a site."""
    service = AdsService(db)
    campaigns = await service.get_campaigns(site_id, current_user, skip=skip, limit=limit)
    return [CampaignResponse.model_validate(c) for c in campaigns]


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    site_id: uuid.UUID, campaign_id: uuid.UUID,
    data: CampaignUpdateRequest, current_user: CurrentUser, db: DB,
):
    """Update campaign settings or status."""
    service = AdsService(db)
    campaign = await service.update_campaign(campaign_id, data, current_user)
    return CampaignResponse.model_validate(campaign)


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStatsResponse)
async def get_campaign_stats(site_id: uuid.UUID, campaign_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Get campaign performance statistics."""
    service = AdsService(db)
    return await service.get_campaign_stats(campaign_id, current_user)


@router.post("/campaigns/{campaign_id}/groups", response_model=AdGroupResponse, status_code=201)
async def create_ad_group(
    site_id: uuid.UUID, campaign_id: uuid.UUID,
    data: AdGroupCreateRequest, current_user: CurrentUser, db: DB,
):
    """Create an ad group with keywords within a campaign."""
    service = AdsService(db)
    group = await service.create_ad_group(campaign_id, data, current_user)
    return AdGroupResponse.model_validate(group)


@router.get("/campaigns/{campaign_id}/groups", response_model=List[AdGroupResponse])
async def list_ad_groups(site_id: uuid.UUID, campaign_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """List all ad groups in a campaign."""
    service = AdsService(db)
    await service.get_campaign_stats(campaign_id, current_user)  # checks access
    repo = AdGroupRepository(db)
    groups = await repo.get_by_campaign(campaign_id)
    return [AdGroupResponse.model_validate(g) for g in groups]


@router.post("/campaigns/{campaign_id}/groups/{group_id}/ads", response_model=AdResponse, status_code=201)
async def create_ad(
    site_id: uuid.UUID, campaign_id: uuid.UUID, group_id: uuid.UUID,
    data: AdCreateRequest, current_user: CurrentUser, db: DB,
):
    """Create an ad within an ad group."""
    service = AdsService(db)
    ad = await service.create_ad(group_id, data, current_user)
    return AdResponse.model_validate(ad)


@router.get("/campaigns/{campaign_id}/groups/{group_id}/ads", response_model=List[AdResponse])
async def list_ads(
    site_id: uuid.UUID, campaign_id: uuid.UUID, group_id: uuid.UUID,
    current_user: CurrentUser, db: DB,
):
    """List all ads in an ad group."""
    service = AdsService(db)
    group_repo = AdGroupRepository(db)
    group = await group_repo.get_by_id(group_id)
    if not group:
        raise NotFoundError("Ad group", group_id)
    await service._assert_site_owner(group.site_id, current_user)

    ad_repo = AdRepository(db)
    ads = await ad_repo.get_by_group(group_id)
    return [AdResponse.model_validate(a) for a in ads]


@router.patch("/campaigns/{campaign_id}/groups/{group_id}/ads/{ad_id}", response_model=AdResponse)
async def update_ad(
    site_id: uuid.UUID, campaign_id: uuid.UUID, group_id: uuid.UUID, ad_id: uuid.UUID,
    data: AdUpdateRequest, current_user: CurrentUser, db: DB,
):
    """Update ad status or settings (activate, pause, etc.)."""
    service = AdsService(db)
    ad = await service.update_ad(ad_id, data, current_user)
    return AdResponse.model_validate(ad)


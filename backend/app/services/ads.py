from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime, timezone
from app.models.ads import AdCampaign, AdGroup, Ad, AdClick, CampaignStatus, AdStatus
from app.models.user import User
from app.repositories.ads import AdCampaignRepository, AdGroupRepository, AdRepository, AdClickRepository
from app.repositories.site import SiteRepository
from app.core.elasticsearch import get_es
from app.core.config import settings
from app.core.exceptions import NotFoundError, PermissionDeniedError, QuotaExceededError
from app.schemas.ads import (
    CampaignCreateRequest, CampaignUpdateRequest, AdGroupCreateRequest,
    AdCreateRequest, AdUpdateRequest, CampaignStatsResponse, AdStatsResponse,
)
import structlog
import uuid

logger = structlog.get_logger()


class AdsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.campaign_repo = AdCampaignRepository(db)
        self.group_repo = AdGroupRepository(db)
        self.ad_repo = AdRepository(db)
        self.click_repo = AdClickRepository(db)
        self.site_repo = SiteRepository(db)

    async def _assert_site_owner(self, site_id: uuid.UUID, user: User) -> None:
        site = await self.site_repo.get_by_id(site_id)
        if not site:
            raise NotFoundError("Site", site_id)
        if not user.is_admin and site.owner_id != user.id:
            raise PermissionDeniedError()

    async def create_campaign(self, site_id: uuid.UUID, data: CampaignCreateRequest, user: User) -> AdCampaign:
        await self._assert_site_owner(site_id, user)
        campaign = AdCampaign(
            site_id=site_id,
            name=data.name,
            budget=data.budget,
            budget_type=data.budget_type,
            bidding_strategy=data.bidding_strategy,
            start_date=data.start_date,
            end_date=data.end_date,
            status=CampaignStatus.DRAFT,
        )
        return await self.campaign_repo.create(campaign)

    async def update_campaign(self, campaign_id: uuid.UUID, data: CampaignUpdateRequest, user: User) -> AdCampaign:
        campaign = await self.campaign_repo.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign", campaign_id)
        await self._assert_site_owner(campaign.site_id, user)
        update_data = data.model_dump(exclude_none=True)
        return await self.campaign_repo.update(campaign, **update_data)

    async def get_campaigns(self, site_id: uuid.UUID, user: User, skip: int = 0, limit: int = 20) -> List[AdCampaign]:
        await self._assert_site_owner(site_id, user)
        return list(await self.campaign_repo.get_by_site(site_id, skip=skip, limit=limit))

    async def create_ad_group(self, campaign_id: uuid.UUID, data: AdGroupCreateRequest, user: User) -> AdGroup:
        campaign = await self.campaign_repo.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign", campaign_id)
        await self._assert_site_owner(campaign.site_id, user)

        group = AdGroup(
            campaign_id=campaign_id,
            site_id=campaign.site_id,
            name=data.name,
            keywords=data.keywords,
            default_bid=data.default_bid,
        )
        return await self.group_repo.create(group)

    async def create_ad(self, group_id: uuid.UUID, data: AdCreateRequest, user: User) -> Ad:
        group = await self.group_repo.get_by_id(group_id)
        if not group:
            raise NotFoundError("Ad group", group_id)
        await self._assert_site_owner(group.site_id, user)

        if data.bid_amount < settings.MIN_BID_AMOUNT:
            raise ValueError(f"Minimum bid is {settings.MIN_BID_AMOUNT}")

        ad = Ad(
            group_id=group_id,
            site_id=group.site_id,
            product_id=data.product_id,
            headline=data.headline,
            description=data.description,
            destination_url=data.destination_url,
            display_url=data.display_url,
            bid_amount=data.bid_amount,
            status=AdStatus.PENDING_REVIEW,
        )
        return await self.ad_repo.create(ad)

    async def update_ad(self, ad_id: uuid.UUID, data: AdUpdateRequest, user: User) -> Ad:
        ad = await self.ad_repo.get_by_id(ad_id)
        if not ad:
            raise NotFoundError("Ad", ad_id)
        await self._assert_site_owner(ad.site_id, user)
        update_data = data.model_dump(exclude_none=True)
        return await self.ad_repo.update(ad, **update_data)

    async def record_click(self, ad_id: uuid.UUID, ip: str, user_agent: str, query: str) -> AdClick:
        ad = await self.ad_repo.get_by_id(ad_id)
        if not ad or ad.status != AdStatus.ACTIVE:
            raise NotFoundError("Ad", ad_id)

        cost = ad.bid_amount
        click = AdClick(
            ad_id=ad_id,
            ip_address=ip,
            user_agent=user_agent,
            search_query=query,
            cost=cost,
            clicked_at=datetime.now(timezone.utc),
        )
        await self.click_repo.create(click)
        await self.ad_repo.increment_click(ad_id, cost)

        # Load the group to get campaign_id (avoid lazy relationship access in async context)
        group = await self.group_repo.get_by_id(ad.group_id)
        if group:
            await self.campaign_repo.increment_click_stats(group.campaign_id, cost)
            await self.campaign_repo.check_and_exhaust_budget(group.campaign_id)

        return click

    async def get_campaign_stats(self, campaign_id: uuid.UUID, user: User) -> CampaignStatsResponse:
        campaign = await self.campaign_repo.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign", campaign_id)
        await self._assert_site_owner(campaign.site_id, user)

        groups = await self.group_repo.get_by_campaign(campaign_id)
        all_ads = []
        for group in groups:
            ads = await self.ad_repo.get_by_group(group.id)
            all_ads.extend(ads)

        active_ads = [a for a in all_ads if a.status == AdStatus.ACTIVE]
        total_clicks = sum(a.clicks for a in all_ads)
        total_impressions = campaign.total_impressions
        ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        avg_cpc = (campaign.spent_amount / total_clicks) if total_clicks > 0 else 0

        return CampaignStatsResponse(
            campaign_id=campaign.id,
            total_impressions=total_impressions,
            total_clicks=total_clicks,
            total_spent=campaign.spent_amount,
            ctr=round(ctr, 4),
            avg_cpc=round(avg_cpc, 4),
            remaining_budget=campaign.budget - campaign.spent_amount,
            ads_count=len(all_ads),
            active_ads_count=len(active_ads),
        )

    async def auto_manage_campaign_statuses(self):
        """Activate DRAFT campaigns whose start_date has arrived; end ACTIVE campaigns whose end_date has passed."""
        to_activate = await self.campaign_repo.get_draft_campaigns_to_activate()
        for campaign in to_activate:
            await self.campaign_repo.update(campaign, status=CampaignStatus.ACTIVE)
            logger.info("Campaign auto-activated", campaign_id=str(campaign.id))

        to_end = await self.campaign_repo.get_active_campaigns_to_end()
        for campaign in to_end:
            await self.campaign_repo.update(campaign, status=CampaignStatus.ENDED)
            logger.info("Campaign auto-ended", campaign_id=str(campaign.id))

    async def update_es_ad_boosts(self):
        """Update ad boost scores in Elasticsearch for active ads."""
        es = await get_es()
        campaigns = await self.campaign_repo.get_active_campaigns()

        for campaign in campaigns:
            groups = await self.group_repo.get_by_campaign(campaign.id)
            for group in groups:
                ads = await self.ad_repo.get_by_group(group.id)
                for ad in ads:
                    if ad.status != AdStatus.ACTIVE or not ad.product_id:
                        continue
                    try:
                        await es.update(
                            index=settings.ES_INDEX_PRODUCTS,
                            id=str(ad.product_id),
                            doc={"ad_boost_score": ad.bid_amount, "is_sponsored": True},
                        )
                    except Exception as e:
                        logger.warning("ES boost update failed", ad_id=str(ad.id), error=str(e))


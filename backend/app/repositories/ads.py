from typing import Optional, List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from app.models.ads import AdCampaign, AdGroup, Ad, AdClick, CampaignStatus, AdStatus
from app.repositories.base import BaseRepository
import uuid
from datetime import datetime, timezone


class AdCampaignRepository(BaseRepository[AdCampaign]):
    def __init__(self, db: AsyncSession):
        super().__init__(AdCampaign, db)

    async def get_by_site(self, site_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Sequence[AdCampaign]:
        result = await self.db.execute(
            select(AdCampaign)
            .where(AdCampaign.site_id == site_id)
            .order_by(AdCampaign.created_at.desc())
            .offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def count_by_site(self, site_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(AdCampaign).where(AdCampaign.site_id == site_id)
        )
        return result.scalar_one()

    async def get_active_campaigns(self) -> Sequence[AdCampaign]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(AdCampaign)
            .where(
                and_(
                    AdCampaign.status == CampaignStatus.ACTIVE,
                    (AdCampaign.start_date.is_(None)) | (AdCampaign.start_date <= now),
                    (AdCampaign.end_date.is_(None)) | (AdCampaign.end_date >= now),
                )
            )
        )
        return result.scalars().all()

    async def count_active(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(AdCampaign).where(AdCampaign.status == CampaignStatus.ACTIVE)
        )
        return result.scalar_one()

    async def get_draft_campaigns_to_activate(self) -> Sequence[AdCampaign]:
        """DRAFT campaigns whose start_date has arrived (or have no start_date)."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(AdCampaign).where(
                and_(
                    AdCampaign.status == CampaignStatus.DRAFT,
                    (AdCampaign.start_date.is_(None)) | (AdCampaign.start_date <= now),
                )
            )
        )
        return result.scalars().all()

    async def get_active_campaigns_to_end(self) -> Sequence[AdCampaign]:
        """ACTIVE campaigns whose end_date has passed."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(AdCampaign).where(
                and_(
                    AdCampaign.status == CampaignStatus.ACTIVE,
                    AdCampaign.end_date.isnot(None),
                    AdCampaign.end_date < now,
                )
            )
        )
        return result.scalars().all()

    async def increment_spent(self, campaign_id: uuid.UUID, amount: float):
        await self.db.execute(
            update(AdCampaign)
            .where(AdCampaign.id == campaign_id)
            .values(spent_amount=AdCampaign.spent_amount + amount)
        )

    async def increment_click_stats(self, campaign_id: uuid.UUID, cost: float):
        """Atomically increment campaign total_clicks and spent_amount."""
        await self.db.execute(
            update(AdCampaign)
            .where(AdCampaign.id == campaign_id)
            .values(
                total_clicks=AdCampaign.total_clicks + 1,
                spent_amount=AdCampaign.spent_amount + cost,
            )
        )

    async def check_and_exhaust_budget(self, campaign_id: uuid.UUID):
        """Set campaign to BUDGET_EXHAUSTED if spent_amount >= budget."""
        result = await self.db.execute(
            select(AdCampaign).where(
                and_(
                    AdCampaign.id == campaign_id,
                    AdCampaign.status == CampaignStatus.ACTIVE,
                    AdCampaign.spent_amount >= AdCampaign.budget,
                    AdCampaign.budget_type == "total",
                )
            )
        )
        campaign = result.scalar_one_or_none()
        if campaign:
            await self.db.execute(
                update(AdCampaign)
                .where(AdCampaign.id == campaign_id)
                .values(status=CampaignStatus.BUDGET_EXHAUSTED)
            )


class AdGroupRepository(BaseRepository[AdGroup]):
    def __init__(self, db: AsyncSession):
        super().__init__(AdGroup, db)

    async def get_by_campaign(self, campaign_id: uuid.UUID) -> Sequence[AdGroup]:
        result = await self.db.execute(
            select(AdGroup).where(AdGroup.campaign_id == campaign_id)
        )
        return result.scalars().all()

    async def get_active_by_keywords(self, keywords: List[str]) -> Sequence[AdGroup]:
        """Get active ad groups that match any of the given keywords."""
        result = await self.db.execute(
            select(AdGroup).where(
                and_(
                    AdGroup.is_active == True,
                    AdGroup.keywords.op("@>")(keywords),
                )
            )
        )
        return result.scalars().all()


class AdRepository(BaseRepository[Ad]):
    def __init__(self, db: AsyncSession):
        super().__init__(Ad, db)

    async def get_by_group(self, group_id: uuid.UUID) -> Sequence[Ad]:
        result = await self.db.execute(
            select(Ad).where(Ad.group_id == group_id)
        )
        return result.scalars().all()

    async def get_active_by_site(self, site_id: uuid.UUID) -> Sequence[Ad]:
        result = await self.db.execute(
            select(Ad).where(and_(Ad.site_id == site_id, Ad.status == AdStatus.ACTIVE))
        )
        return result.scalars().all()

    async def increment_impression(self, ad_id: uuid.UUID):
        await self.db.execute(
            update(Ad).where(Ad.id == ad_id).values(impressions=Ad.impressions + 1)
        )

    async def increment_click(self, ad_id: uuid.UUID, cost: float):
        await self.db.execute(
            update(Ad).where(Ad.id == ad_id).values(
                clicks=Ad.clicks + 1,
                spent_amount=Ad.spent_amount + cost,
            )
        )


class AdClickRepository(BaseRepository[AdClick]):
    def __init__(self, db: AsyncSession):
        super().__init__(AdClick, db)

    async def get_by_ad(self, ad_id: uuid.UUID, skip: int = 0, limit: int = 100) -> Sequence[AdClick]:
        result = await self.db.execute(
            select(AdClick).where(AdClick.ad_id == ad_id)
            .order_by(AdClick.clicked_at.desc())
            .offset(skip).limit(limit)
        )
        return result.scalars().all()


import uuid
import enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Enum, Text, Integer, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.site import Site


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    BUDGET_EXHAUSTED = "budget_exhausted"


class BudgetType(str, enum.Enum):
    DAILY = "daily"
    TOTAL = "total"


class AdStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DISAPPROVED = "disapproved"
    PENDING_REVIEW = "pending_review"


class BiddingStrategy(str, enum.Enum):
    CPC = "cpc"   # Cost per click
    CPM = "cpm"   # Cost per thousand impressions


class AdCampaign(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ad_campaigns"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT, nullable=False)
    budget: Mapped[float] = mapped_column(Float, nullable=False)
    budget_type: Mapped[BudgetType] = mapped_column(Enum(BudgetType), default=BudgetType.DAILY, nullable=False)
    spent_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    start_date: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bidding_strategy: Mapped[BiddingStrategy] = mapped_column(Enum(BiddingStrategy), default=BiddingStrategy.CPC)

    # Stats
    total_impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="campaigns")
    groups: Mapped[List["AdGroup"]] = relationship("AdGroup", back_populates="campaign", lazy="select")

    def __repr__(self) -> str:
        return f"<AdCampaign {self.name}>"


class AdGroup(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ad_groups"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ad_campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    keywords: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    default_bid: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    campaign: Mapped["AdCampaign"] = relationship("AdCampaign", back_populates="groups")
    ads: Mapped[List["Ad"]] = relationship("Ad", back_populates="group", lazy="select")

    def __repr__(self) -> str:
        return f"<AdGroup {self.name}>"


class Ad(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ads"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ad_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    headline: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    destination_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    display_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bid_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[AdStatus] = mapped_column(Enum(AdStatus), default=AdStatus.PENDING_REVIEW, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    spent_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    group: Mapped["AdGroup"] = relationship("AdGroup", back_populates="ads")
    click_records: Mapped[List["AdClick"]] = relationship("AdClick", back_populates="ad", lazy="select")

    def __repr__(self) -> str:
        return f"<Ad {self.headline}>"


class AdClick(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ad_clicks"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    search_query: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    clicked_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    ad: Mapped["Ad"] = relationship("Ad", back_populates="click_records")


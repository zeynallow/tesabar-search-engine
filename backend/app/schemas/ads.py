from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.ads import CampaignStatus, BudgetType, AdStatus, BiddingStrategy
import uuid


class CampaignCreateRequest(BaseModel):
    name: str
    budget: float
    budget_type: BudgetType = BudgetType.DAILY
    bidding_strategy: BiddingStrategy = BiddingStrategy.CPC
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Budget must be positive")
        return v


class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    name: str
    status: CampaignStatus
    budget: float
    budget_type: BudgetType
    spent_amount: float
    bidding_strategy: BiddingStrategy
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    total_impressions: int
    total_clicks: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AdGroupCreateRequest(BaseModel):
    name: str
    keywords: List[str]
    default_bid: float

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: List[str]) -> List[str]:
        if len(v) > 100:
            raise ValueError("Maximum 100 keywords per group")
        return [k.strip().lower() for k in v if k.strip()]

    @field_validator("default_bid")
    @classmethod
    def validate_bid(cls, v: float) -> float:
        if v < 0.01:
            raise ValueError("Minimum bid is 0.01")
        return v


class AdGroupResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    name: str
    keywords: Optional[List[str]]
    default_bid: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdUpdateRequest(BaseModel):
    status: Optional[AdStatus] = None
    bid_amount: Optional[float] = None
    headline: Optional[str] = None


class AdCreateRequest(BaseModel):
    headline: str
    description: Optional[str] = None
    destination_url: str
    display_url: Optional[str] = None
    bid_amount: float
    product_id: Optional[uuid.UUID] = None

    @field_validator("destination_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("bid_amount")
    @classmethod
    def validate_bid(cls, v: float) -> float:
        if v < 0.01:
            raise ValueError("Minimum bid is 0.01")
        return v


class AdResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    site_id: uuid.UUID
    headline: str
    description: Optional[str]
    destination_url: str
    display_url: Optional[str]
    bid_amount: float
    status: AdStatus
    impressions: int
    clicks: int
    spent_amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class AdStatsResponse(BaseModel):
    ad_id: uuid.UUID
    impressions: int
    clicks: int
    ctr: float  # click through rate
    spent_amount: float
    avg_position: Optional[float]
    period: str  # today / week / month / all


class CampaignStatsResponse(BaseModel):
    campaign_id: uuid.UUID
    total_impressions: int
    total_clicks: int
    total_spent: float
    ctr: float
    avg_cpc: float
    remaining_budget: float
    ads_count: int
    active_ads_count: int


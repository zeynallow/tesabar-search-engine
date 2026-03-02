from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional, List
from datetime import datetime
from app.models.site import SiteStatus
import uuid
import re


def validate_domain(v: str) -> str:
    v = v.strip().lower()
    # v = re.sub(r"^https?://", "", v)
    # v = v.rstrip("/")
    # if not re.match(r"^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$", v):
    #     raise ValueError("Invalid domain format")
    return v


class SiteCreateRequest(BaseModel):
    domain: str
    name: str
    description: Optional[str] = None
    country: Optional[str] = None

    @field_validator("domain")
    @classmethod
    def _validate_domain(cls, v: str) -> str:
        return validate_domain(v)

    @field_validator("country")
    @classmethod
    def _validate_country(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Country must be a 2-letter ISO code (e.g. AZ, US)")
        return v


class SiteUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SiteVerificationResponse(BaseModel):
    method: str
    token: str
    instructions: str


class SiteResponse(BaseModel):
    id: uuid.UUID
    domain: str
    name: str
    description: Optional[str]
    country: Optional[str]
    status: SiteStatus
    is_domain_verified: bool
    total_pages_indexed: int
    total_pages_crawled: int
    total_pages_with_issues: int
    last_crawled_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class SiteStatsResponse(BaseModel):
    site_id: uuid.UUID
    domain: str
    total_pages_indexed: int
    total_pages_crawled: int
    total_pages_with_issues: int
    total_products: int
    index_coverage_percent: float
    last_crawled_at: Optional[datetime]
    issues_by_type: dict
    crawl_errors_count: int
    pages_by_type: dict


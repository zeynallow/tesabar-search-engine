from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.site import SitemapStatus, SitemapSource
import uuid


class SitemapAddRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Sitemap URL must start with http:// or https://")
        if not any(term in v for term in ["sitemap", ".xml"]):
            raise ValueError("URL does not appear to be a sitemap (must contain 'sitemap' or end with .xml)")
        return v


class SitemapResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    url: str
    source: SitemapSource
    status: SitemapStatus
    last_fetched_at: Optional[datetime]
    url_count: int
    error_message: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SitemapFetchRequest(BaseModel):
    sitemap_id: uuid.UUID
    force: bool = False


class SitemapTestResponse(BaseModel):
    url: str
    is_valid: bool
    url_count: int
    detected_type: str  # sitemap_index / url_set
    sample_urls: List[str]
    error: Optional[str] = None


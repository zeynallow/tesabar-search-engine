from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.site import SiteStatus, SitemapSource
import uuid


class AdminSiteListResponse(BaseModel):
    id: uuid.UUID
    domain: str
    name: str
    owner_email: str
    status: SiteStatus
    is_domain_verified: bool
    total_pages_indexed: int
    total_pages_crawled: int
    last_crawled_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminSiteUpdateRequest(BaseModel):
    status: Optional[SiteStatus] = None
    is_domain_verified: Optional[bool] = None


class AdminAddSitemapRequest(BaseModel):
    url: str
    source: SitemapSource = SitemapSource.ADMIN
    trigger_fetch: bool = True


class AdminSiteDetailResponse(BaseModel):
    id: uuid.UUID
    domain: str
    name: str
    description: Optional[str]
    country: Optional[str]
    owner_email: str
    owner_id: uuid.UUID
    status: SiteStatus
    is_domain_verified: bool
    total_pages_indexed: int
    total_pages_crawled: int
    total_pages_with_issues: int
    last_crawled_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class SystemStatsResponse(BaseModel):
    total_sites: int
    active_sites: int
    total_pages_indexed: int
    total_products_indexed: int
    total_users: int
    total_active_campaigns: int
    indexing_jobs_running: int
    indexing_jobs_queued: int
    es_index_size_mb: float
    search_queries_today: int


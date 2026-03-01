from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.indexing import PageType, PageStatus, JobStatus
import uuid


class SEOIssue(BaseModel):
    type: str           # missing_title / duplicate_title / missing_description / broken_link etc.
    severity: str       # error / warning / info
    message: str
    affected_url: Optional[str] = None
    recommendation: Optional[str] = None


class IndexedPageResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    url: str
    canonical_url: Optional[str]
    title: Optional[str]
    meta_description: Optional[str]
    page_type: PageType
    status: PageStatus
    status_code: Optional[int]
    is_indexed: bool
    is_mobile_friendly: Optional[bool]
    page_speed_score: Optional[float]
    last_crawled_at: Optional[datetime]
    seo_issues: Optional[List[SEOIssue]]
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class IndexingJobResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    status: JobStatus
    job_type: str
    total_urls: int
    processed_urls: int
    failed_urls: int
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PageIssuesReport(BaseModel):
    site_id: uuid.UUID
    total_issues: int
    errors: int
    warnings: int
    infos: int
    issues_by_type: Dict[str, int]
    affected_pages: int
    sample_issues: List[SEOIssue]


class RequestIndexingRequest(BaseModel):
    urls: List[str]

    @field_validator("urls")
    @classmethod
    def validate_urls(cls, v: List[str]) -> List[str]:
        if len(v) > 200:
            raise ValueError("Maximum 200 URLs per request")
        for url in v:
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"Invalid URL: {url}")
        return v


class CrawlConfigRequest(BaseModel):
    respect_robots_txt: bool = True
    crawl_delay: float = 0.5
    max_urls_per_crawl: int = 1000


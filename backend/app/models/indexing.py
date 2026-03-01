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


class PageType(str, enum.Enum):
    PRODUCT = "product"
    CATEGORY = "category"
    HOMEPAGE = "homepage"
    ARTICLE = "article"
    OTHER = "other"


class PageStatus(str, enum.Enum):
    PENDING = "pending"
    CRAWLING = "crawling"
    INDEXED = "indexed"
    FAILED = "failed"
    EXCLUDED = "excluded"
    NOINDEX = "noindex"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IndexedPage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "indexed_pages"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    canonical_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    meta_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_type: Mapped[PageType] = mapped_column(Enum(PageType), default=PageType.OTHER, nullable=False, index=True)
    status: Mapped[PageStatus] = mapped_column(Enum(PageStatus), default=PageStatus.PENDING, nullable=False, index=True)
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_mobile_friendly: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    page_speed_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_crawled_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_crawl_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # SEO issues stored as structured JSON array
    seo_issues: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Raw crawl data
    crawl_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Schema.org / LD+JSON data
    structured_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # HTTP headers
    response_headers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="pages")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="page", uselist=False)

    def __repr__(self) -> str:
        return f"<IndexedPage {self.url}>"


class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indexed_pages.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(1024), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, index=True)
    sku: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    original_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    discount_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    images: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    attributes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    es_indexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    page: Mapped["IndexedPage"] = relationship("IndexedPage", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product {self.name}>"


class IndexingJob(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "indexing_jobs"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sitemap_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sitemap_entries.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # sitemap_fetch / crawl / reindex
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_urls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_urls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_urls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    site: Mapped["Site"] = relationship("Site", back_populates="indexing_jobs")


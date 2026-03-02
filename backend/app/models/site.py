import uuid
import enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Enum, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.indexing import IndexedPage, IndexingJob
    from app.models.ads import AdCampaign


class SiteStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"


class SitemapStatus(str, enum.Enum):
    PENDING = "pending"
    FETCHING = "fetching"
    FETCHED = "fetched"
    FAILED = "failed"


class SitemapSource(str, enum.Enum):
    CONSOLE = "console"
    ADMIN = "admin"
    AUTO = "auto"


class Site(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sites"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True, index=True)
    favicon_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    status: Mapped[SiteStatus] = mapped_column(Enum(SiteStatus), default=SiteStatus.PENDING, nullable=False)
    is_domain_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Indexing stats
    total_pages_indexed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pages_crawled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_pages_with_issues: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_crawled_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="sites")
    sitemaps: Mapped[List["SitemapEntry"]] = relationship("SitemapEntry", back_populates="site", lazy="select")
    pages: Mapped[List["IndexedPage"]] = relationship("IndexedPage", back_populates="site", lazy="select")
    campaigns: Mapped[List["AdCampaign"]] = relationship("AdCampaign", back_populates="site", lazy="select")
    indexing_jobs: Mapped[List["IndexingJob"]] = relationship("IndexingJob", back_populates="site", lazy="select")

    def __repr__(self) -> str:
        return f"<Site {self.domain}>"


class SitemapEntry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sitemap_entries"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    source: Mapped[SitemapSource] = mapped_column(Enum(SitemapSource), default=SitemapSource.CONSOLE, nullable=False)
    status: Mapped[SitemapStatus] = mapped_column(Enum(SitemapStatus), default=SitemapStatus.PENDING, nullable=False)
    last_fetched_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    url_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    site: Mapped["Site"] = relationship("Site", back_populates="sitemaps")

    def __repr__(self) -> str:
        return f"<SitemapEntry {self.url}>"


class SiteVerification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "site_verifications"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False
    )
    method: Mapped[str] = mapped_column(String(50), nullable=False)  # dns_txt / meta_tag / html_file
    token: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    site: Mapped["Site"] = relationship("Site")


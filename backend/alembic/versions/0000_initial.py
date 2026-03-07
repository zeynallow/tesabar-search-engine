"""Initial database schema

Revision ID: 0000_initial
Revises:
Create Date: 2026-03-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0000_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enum types (created manually so column defs can use create_type=False) ---
    op.execute("CREATE TYPE sitestatus AS ENUM ('pending', 'active', 'suspended', 'banned')")
    op.execute("CREATE TYPE sitemapstatus AS ENUM ('pending', 'fetching', 'fetched', 'failed')")
    op.execute("CREATE TYPE sitemapsource AS ENUM ('console', 'admin', 'auto')")
    op.execute("CREATE TYPE pagetype AS ENUM ('product', 'category', 'homepage', 'article', 'other')")
    op.execute("CREATE TYPE pagestatus AS ENUM ('pending', 'crawling', 'indexed', 'failed', 'excluded', 'noindex')")
    op.execute("CREATE TYPE jobstatus AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled')")
    op.execute("CREATE TYPE campaignstatus AS ENUM ('draft', 'active', 'paused', 'ended', 'budget_exhausted')")
    op.execute("CREATE TYPE budgettype AS ENUM ('daily', 'total')")
    op.execute("CREATE TYPE adstatus AS ENUM ('active', 'paused', 'disapproved', 'pending_review')")
    op.execute("CREATE TYPE biddingstrategy AS ENUM ('cpc', 'cpm')")

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verification_token", sa.String(255), nullable=True),
        sa.Column("refresh_token_hash", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- sites ---
    op.create_table(
        "sites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("country", sa.String(2), nullable=True),
        sa.Column("favicon_url", sa.String(2048), nullable=True),
        sa.Column("status", sa.Enum("pending", "active", "suspended", "banned", name="sitestatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("is_domain_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verification_token", sa.String(100), nullable=True),
        sa.Column("verification_method", sa.String(50), nullable=True),
        sa.Column("total_pages_indexed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pages_crawled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_pages_with_issues", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_crawled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sites_domain", "sites", ["domain"], unique=True)
    op.create_index("ix_sites_owner_id", "sites", ["owner_id"])
    op.create_index("ix_sites_country", "sites", ["country"])

    # --- sitemap_entries ---
    op.create_table(
        "sitemap_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("source", sa.Enum("console", "admin", "auto", name="sitemapsource", create_type=False), nullable=False, server_default="console"),
        sa.Column("status", sa.Enum("pending", "fetching", "fetched", "failed", name="sitemapstatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("last_fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("url_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sitemap_entries_site_id", "sitemap_entries", ["site_id"])

    # --- site_verifications ---
    op.create_table(
        "site_verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("method", sa.String(50), nullable=False),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_site_verifications_site_id", "site_verifications", ["site_id"])

    # --- indexed_pages ---
    op.create_table(
        "indexed_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("canonical_url", sa.String(2048), nullable=True),
        sa.Column("title", sa.String(1024), nullable=True),
        sa.Column("meta_description", sa.Text(), nullable=True),
        sa.Column("page_type", sa.Enum("product", "category", "homepage", "article", "other", name="pagetype", create_type=False), nullable=False, server_default="other"),
        sa.Column("status", sa.Enum("pending", "crawling", "indexed", "failed", "excluded", "noindex", name="pagestatus", create_type=False), nullable=False, server_default="pending"),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("is_indexed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_mobile_friendly", sa.Boolean(), nullable=True),
        sa.Column("page_speed_score", sa.Float(), nullable=True),
        sa.Column("last_crawled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_crawl_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("seo_issues", postgresql.JSONB(), nullable=True),
        sa.Column("crawl_data", postgresql.JSONB(), nullable=True),
        sa.Column("structured_data", postgresql.JSONB(), nullable=True),
        sa.Column("response_headers", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_indexed_pages_site_id", "indexed_pages", ["site_id"])
    op.create_index("ix_indexed_pages_url", "indexed_pages", ["url"])
    op.create_index("ix_indexed_pages_page_type", "indexed_pages", ["page_type"])
    op.create_index("ix_indexed_pages_status", "indexed_pages", ["status"])
    op.create_index("ix_indexed_pages_is_indexed", "indexed_pages", ["is_indexed"])

    # --- products ---
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("indexed_pages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("name", sa.String(1024), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("brand", sa.String(255), nullable=True),
        sa.Column("category", sa.String(512), nullable=True),
        sa.Column("sku", sa.String(255), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("original_price", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(10), nullable=True),
        sa.Column("discount_percent", sa.Float(), nullable=True),
        sa.Column("in_stock", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column("review_count", sa.Integer(), nullable=True),
        sa.Column("images", postgresql.JSONB(), nullable=True),
        sa.Column("attributes", postgresql.JSONB(), nullable=True),
        sa.Column("es_indexed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("page_id", name="uq_products_page_id"),
    )
    op.create_index("ix_products_site_id", "products", ["site_id"])
    op.create_index("ix_products_url", "products", ["url"])
    op.create_index("ix_products_brand", "products", ["brand"])
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_sku", "products", ["sku"])
    op.create_index("ix_products_price", "products", ["price"])
    op.create_index("ix_products_in_stock", "products", ["in_stock"])

    # --- indexing_jobs ---
    op.create_table(
        "indexing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sitemap_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sitemap_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Enum("queued", "running", "completed", "failed", "cancelled", name="jobstatus", create_type=False), nullable=False, server_default="queued"),
        sa.Column("job_type", sa.String(50), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("total_urls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_urls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_urls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_indexing_jobs_site_id", "indexing_jobs", ["site_id"])
    op.create_index("ix_indexing_jobs_status", "indexing_jobs", ["status"])

    # --- ad_campaigns ---
    op.create_table(
        "ad_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.Enum("draft", "active", "paused", "ended", "budget_exhausted", name="campaignstatus", create_type=False), nullable=False, server_default="draft"),
        sa.Column("budget", sa.Float(), nullable=False),
        sa.Column("budget_type", sa.Enum("daily", "total", name="budgettype", create_type=False), nullable=False, server_default="daily"),
        sa.Column("spent_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bidding_strategy", sa.Enum("cpc", "cpm", name="biddingstrategy", create_type=False), nullable=False, server_default="cpc"),
        sa.Column("total_impressions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ad_campaigns_site_id", "ad_campaigns", ["site_id"])

    # --- ad_groups ---
    op.create_table(
        "ad_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("keywords", postgresql.JSONB(), nullable=True),
        sa.Column("default_bid", sa.Float(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ad_groups_campaign_id", "ad_groups", ["campaign_id"])
    op.create_index("ix_ad_groups_site_id", "ad_groups", ["site_id"])

    # --- ads ---
    op.create_table(
        "ads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("headline", sa.String(255), nullable=False),
        sa.Column("description", sa.String(512), nullable=True),
        sa.Column("destination_url", sa.String(2048), nullable=False),
        sa.Column("display_url", sa.String(255), nullable=True),
        sa.Column("bid_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.Enum("active", "paused", "disapproved", "pending_review", name="adstatus", create_type=False), nullable=False, server_default="pending_review"),
        sa.Column("impressions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("spent_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ads_group_id", "ads", ["group_id"])
    op.create_index("ix_ads_site_id", "ads", ["site_id"])

    # --- ad_clicks ---
    op.create_table(
        "ad_clicks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("search_query", sa.String(512), nullable=True),
        sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ad_clicks_ad_id", "ad_clicks", ["ad_id"])


def downgrade() -> None:
    op.drop_table("ad_clicks")
    op.drop_table("ads")
    op.drop_table("ad_groups")
    op.drop_table("ad_campaigns")
    op.drop_table("indexing_jobs")
    op.drop_table("products")
    op.drop_table("indexed_pages")
    op.drop_table("site_verifications")
    op.drop_table("sitemap_entries")
    op.drop_table("sites")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS biddingstrategy")
    op.execute("DROP TYPE IF EXISTS adstatus")
    op.execute("DROP TYPE IF EXISTS budgettype")
    op.execute("DROP TYPE IF EXISTS campaignstatus")
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.execute("DROP TYPE IF EXISTS pagestatus")
    op.execute("DROP TYPE IF EXISTS pagetype")
    op.execute("DROP TYPE IF EXISTS sitemapsource")
    op.execute("DROP TYPE IF EXISTS sitemapstatus")
    op.execute("DROP TYPE IF EXISTS sitestatus")



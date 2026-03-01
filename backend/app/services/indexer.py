from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from app.models.indexing import IndexedPage, Product, PageStatus, PageType
from app.models.site import Site
from app.repositories.indexing import IndexedPageRepository, ProductRepository, IndexingJobRepository
from app.repositories.site import SiteRepository
from app.services.crawler import CrawlResult
from app.core.elasticsearch import get_es
from app.core.config import settings
from datetime import datetime, timezone
import structlog
import uuid

logger = structlog.get_logger()


def _detect_page_type(result: CrawlResult) -> PageType:
    if result.product_data:
        return PageType.PRODUCT
    url_lower = result.url.lower()
    if any(term in url_lower for term in ["/product/", "/p/", "/item/", "/urun/"]):
        return PageType.PRODUCT
    if any(term in url_lower for term in ["/category/", "/cat/", "/c/", "/collection/"]):
        return PageType.CATEGORY
    if result.url.count("/") <= 3:
        return PageType.HOMEPAGE
    return PageType.OTHER


class IndexerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.page_repo = IndexedPageRepository(db)
        self.product_repo = ProductRepository(db)
        self.job_repo = IndexingJobRepository(db)
        self.site_repo = SiteRepository(db)

    async def process_crawl_result(self, site_id: uuid.UUID, result: CrawlResult) -> IndexedPage:
        existing = await self.page_repo.get_by_url(site_id, result.url)
        page_type = _detect_page_type(result)
        now = datetime.now(timezone.utc)

        if result.error:
            status = PageStatus.FAILED
        elif not result.is_indexed:
            status = PageStatus.NOINDEX
        else:
            status = PageStatus.INDEXED

        page_data = {
            "title": result.title,
            "meta_description": result.meta_description,
            "canonical_url": result.canonical_url,
            "page_type": page_type,
            "status": status,
            "status_code": result.status_code,
            "is_indexed": result.is_indexed and not result.error,
            "last_crawled_at": now,
            "seo_issues": result.seo_issues if result.seo_issues else None,
            "structured_data": result.structured_data if result.structured_data else None,
            "response_headers": result.response_headers if result.response_headers else None,
            "error_message": result.error,
        }

        if existing:
            page = await self.page_repo.update(existing, **page_data)
        else:
            page = IndexedPage(site_id=site_id, url=result.url, **page_data)
            page = await self.page_repo.create(page)

        # Sync site stats
        if not existing and page.is_indexed:
            await self.site_repo.increment_stats(
                site_id,
                pages_indexed=1,
                pages_crawled=1,
                pages_with_issues=1 if result.seo_issues else 0,
            )
        elif existing:
            await self.site_repo.increment_stats(site_id, pages_crawled=1)

        # Process product data
        if page.is_indexed and result.product_data:
            await self._process_product(page, result.product_data, site_id)

        return page

    async def _process_product(self, page: IndexedPage, product_data: Dict[str, Any], site_id: uuid.UUID):
        existing_product = await self.product_repo.get_by_page(page.id)

        price = product_data.get("price")
        original_price = product_data.get("original_price")
        discount_percent = None
        if price and original_price and original_price > price:
            discount_percent = round(((original_price - price) / original_price) * 100, 2)

        product_fields = {
            "url": page.url,
            "name": product_data.get("name", page.title or ""),
            "description": product_data.get("description"),
            "brand": product_data.get("brand"),
            "category": product_data.get("category"),
            "sku": product_data.get("sku"),
            "price": price,
            "original_price": original_price,
            "currency": product_data.get("currency", "USD"),
            "discount_percent": discount_percent,
            "in_stock": product_data.get("in_stock", True),
            "rating": product_data.get("rating"),
            "review_count": product_data.get("review_count"),
            "images": product_data.get("images", []),
            "es_indexed": False,
        }

        if existing_product:
            await self.product_repo.update(existing_product, **product_fields)
        else:
            product = Product(page_id=page.id, site_id=site_id, **product_fields)
            await self.product_repo.create(product)

    async def index_product_to_es(self, product: Product, site: Site) -> bool:
        es = await get_es()
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "site_id": str(site.id),
            "site_domain": site.domain,
            "page_id": str(product.page_id),
            "url": product.url,
            "name": product.name,
            "description": product.description,
            "brand": product.brand,
            "category": product.category,
            "price": product.price,
            "original_price": product.original_price,
            "currency": product.currency,
            "discount_percent": product.discount_percent,
            "in_stock": product.in_stock,
            "rating": product.rating,
            "review_count": product.review_count,
            "images": product.images or [],
            "sku": product.sku,
            "ad_boost_score": 0.0,
            "is_sponsored": False,
            "indexed_at": now,
            "updated_at": now,
        }
        try:
            await es.index(index=settings.ES_INDEX_PRODUCTS, id=str(product.id), document=doc)
            return True
        except Exception as e:
            logger.error("ES indexing failed", product_id=str(product.id), error=str(e))
            return False

    async def bulk_index_products_to_es(self, limit: int = 500):
        products = await self.product_repo.get_not_es_indexed(limit=limit)
        if not products:
            return 0

        es = await get_es()
        operations = []
        product_ids = []

        for product in products:
            site = await self.site_repo.get_by_id(product.site_id)
            if not site:
                continue
            now = datetime.now(timezone.utc).isoformat()
            operations.append({"index": {"_index": settings.ES_INDEX_PRODUCTS, "_id": str(product.id)}})
            operations.append({
                "site_id": str(site.id),
                "site_domain": site.domain,
                "page_id": str(product.page_id),
                "url": product.url,
                "name": product.name,
                "description": product.description,
                "brand": product.brand,
                "category": product.category,
                "price": product.price,
                "original_price": product.original_price,
                "currency": product.currency,
                "discount_percent": product.discount_percent,
                "in_stock": product.in_stock,
                "rating": product.rating,
                "review_count": product.review_count,
                "images": product.images or [],
                "sku": product.sku,
                "ad_boost_score": 0.0,
                "is_sponsored": False,
                "indexed_at": now,
                "updated_at": now,
            })
            product_ids.append(product.id)

        if operations:
            await es.bulk(operations=operations)
            await self.product_repo.mark_es_indexed(product_ids)
            logger.info("Bulk ES indexing complete", count=len(product_ids))

        return len(product_ids)


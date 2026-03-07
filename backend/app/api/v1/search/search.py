from fastapi import APIRouter, Query, Request, Depends, HTTPException, status
from typing import Optional, List
from app.api.deps import Cache
from app.schemas.search import (
    SearchRequest, SearchResponse, AutocompleteResponse,
    CompareRequest, CompareResponse, SortField,
    TrendingResponse, PopularStore, PopularStoresResponse,
    CategoriesResponse, PublicStatsResponse,
)
from app.schemas.common import MessageResponse
from app.services.search import SearchService
from app.repositories.site import SiteRepository
from app.repositories.indexing import ProductRepository
from app.models.site import SiteStatus
from app.core.database import get_db
from app.core.redis_client import get_redis, CacheManager

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
async def search(
    request: Request,
    cache: Cache,
    q: str = Query(..., min_length=1, max_length=512, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: SortField = Query(SortField.RELEVANCE),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    brands: Optional[List[str]] = Query(None),
    categories: Optional[List[str]] = Query(None),
    in_stock_only: bool = Query(False),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    site_ids: Optional[List[str]] = Query(None),
):
    """
    E-commerce search endpoint. Returns products with facets, filters, and sponsored results.
    Sponsored products appear at the top based on bid amount.
    """
    search_req = SearchRequest(
        q=q,
        page=page,
        page_size=page_size,
        sort=sort,
        min_price=min_price,
        max_price=max_price,
        brands=brands,
        categories=categories,
        in_stock_only=in_stock_only,
        min_rating=min_rating,
        site_ids=site_ids,
    )
    service = SearchService(cache=cache)
    return await service.search(search_req)


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(
    cache: Cache,
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=20),
):
    """Get search autocomplete suggestions."""
    service = SearchService(cache=cache)
    return await service.autocomplete(q, limit=limit)


@router.post("/compare", response_model=CompareResponse)
async def compare_products(data: CompareRequest):
    """
    Compare multiple products side by side.
    Pass 2-5 product IDs from search results.
    """
    service = SearchService()
    return await service.compare_products(data.product_ids)


@router.post("/ads/{ad_id}/click", response_model=MessageResponse)
async def track_ad_click(
    ad_id: str,
    request: Request,
    q: str = Query("", description="Search query that led to this click"),
    db=Depends(get_db),
    redis=Depends(get_redis),
):
    """
    Track a click on a sponsored ad result.
    Includes IP-based rate limiting (max 3 clicks per ad per IP per hour) to prevent click fraud.
    """
    import uuid
    from app.services.ads import AdsService

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")

    # Rate limiting: max 3 clicks per (IP, ad) per hour
    cache = CacheManager(redis)
    rate_key = f"adclick:{client_ip}:{ad_id}"
    click_count = await cache.increment(rate_key, ttl=3600)
    if click_count > 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many clicks from this IP. Please try again later.",
        )

    service = AdsService(db)
    await service.record_click(
        ad_id=uuid.UUID(ad_id),
        ip=client_ip,
        user_agent=user_agent,
        query=q,
    )
    return MessageResponse(message="Click tracked")


@router.get("/trending", response_model=TrendingResponse)
async def get_trending(
    cache: Cache,
    limit: int = Query(6, ge=1, le=20),
):
    """Return trending search terms derived from top product categories and brands in the index."""
    service = SearchService(cache=cache)
    return await service.get_trending(limit=limit)


@router.get("/categories", response_model=CategoriesResponse)
async def get_categories(
    cache: Cache,
    limit: int = Query(20, ge=1, le=50),
):
    """Return all unique product categories available in the search index."""
    service = SearchService(cache=cache)
    return await service.get_categories(limit=limit)


@router.get("/popular-stores", response_model=PopularStoresResponse)
async def get_popular_stores(
    limit: int = Query(6, ge=1, le=20),
    db=Depends(get_db),
):
    """Return the most popular stores (active sites) by number of indexed pages."""
    repo = SiteRepository(db)
    sites = await repo.get_popular(limit=limit)
    stores = [
        PopularStore(
            id=str(site.id),
            name=site.name,
            domain=site.domain,
            total_pages_indexed=site.total_pages_indexed or 0,
        )
        for site in sites
    ]
    return PopularStoresResponse(stores=stores)


@router.get("/stats", response_model=PublicStatsResponse)
async def get_public_stats(db=Depends(get_db)):
    """Return public platform statistics (no auth required)."""
    site_repo = SiteRepository(db)
    product_repo = ProductRepository(db)
    total_sites = await site_repo.count_by_status(SiteStatus.ACTIVE)
    total_products = await product_repo.count()
    return PublicStatsResponse(
        total_sites=total_sites,
        total_products_indexed=total_products,
    )


from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid


class SortField(str, Enum):
    RELEVANCE = "relevance"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    RATING = "rating"
    NEWEST = "newest"
    DISCOUNT = "discount"


class SearchRequest(BaseModel):
    q: str
    page: int = 1
    page_size: int = 20
    sort: SortField = SortField.RELEVANCE

    # Filters
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    brands: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    in_stock_only: bool = False
    min_rating: Optional[float] = None
    site_ids: Optional[List[str]] = None

    @field_validator("q")
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Search query cannot be empty")
        if len(v) > 512:
            raise ValueError("Search query too long")
        return v

    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v: int) -> int:
        if v > 100:
            raise ValueError("Maximum page size is 100")
        return v


class ProductSearchResult(BaseModel):
    id: str
    site_id: str
    site_domain: str
    url: str
    name: str
    description: Optional[str]
    brand: Optional[str]
    category: Optional[str]
    price: Optional[float]
    original_price: Optional[float]
    currency: Optional[str]
    discount_percent: Optional[float]
    in_stock: bool
    rating: Optional[float]
    review_count: Optional[int]
    images: Optional[List[str]]
    sku: Optional[str]
    is_sponsored: bool = False
    relevance_score: Optional[float] = None
    highlight: Optional[Dict[str, List[str]]] = None


class SearchFacet(BaseModel):
    key: str
    count: int


class SearchFacets(BaseModel):
    brands: List[SearchFacet]
    categories: List[SearchFacet]
    price_ranges: List[SearchFacet]
    sites: List[SearchFacet]
    in_stock_count: int
    out_of_stock_count: int


class PriceStats(BaseModel):
    min: Optional[float]
    max: Optional[float]
    avg: Optional[float]


class SearchResponse(BaseModel):
    query: str
    total: int
    page: int
    page_size: int
    total_pages: int
    results: List[ProductSearchResult]
    facets: SearchFacets
    price_stats: PriceStats
    sponsored_count: int
    took_ms: int


class AutocompleteRequest(BaseModel):
    q: str
    limit: int = 10


class AutocompleteResult(BaseModel):
    text: str
    type: str  # product / brand / category


class AutocompleteResponse(BaseModel):
    query: str
    suggestions: List[AutocompleteResult]


class CompareRequest(BaseModel):
    product_ids: List[str]

    @field_validator("product_ids")
    @classmethod
    def validate_ids(cls, v: List[str]) -> List[str]:
        if len(v) < 2:
            raise ValueError("At least 2 products required for comparison")
        if len(v) > 5:
            raise ValueError("Maximum 5 products can be compared")
        return v


class ProductAttribute(BaseModel):
    name: str
    value: Any


class ProductCompareItem(BaseModel):
    product: ProductSearchResult
    attributes: List[ProductAttribute]


class CompareResponse(BaseModel):
    products: List[ProductCompareItem]
    common_attributes: List[str]
    diff_attributes: List[str]


class TrendingItem(BaseModel):
    query: str
    category: str
    count: str


class TrendingResponse(BaseModel):
    trending: List[TrendingItem]


class PopularStore(BaseModel):
    id: str
    name: str
    domain: str
    total_pages_indexed: int


class PopularStoresResponse(BaseModel):
    stores: List[PopularStore]


class CategoriesResponse(BaseModel):
    categories: List[str]


class PublicStatsResponse(BaseModel):
    total_sites: int
    total_products_indexed: int


from elasticsearch import AsyncElasticsearch
from typing import Optional, List, Dict, Any
from app.core.elasticsearch import get_es
from app.core.config import settings
from app.core.redis_client import CacheManager
from app.schemas.search import (
    SearchRequest, SearchResponse, SearchFacets, SearchFacet,
    PriceStats, ProductSearchResult, AutocompleteResponse, AutocompleteResult,
    CompareResponse, ProductCompareItem, ProductAttribute, SortField,
    TrendingItem, TrendingResponse, CategoriesResponse,
)
import time
import structlog
import hashlib
import json

logger = structlog.get_logger()


def _build_sort(sort: SortField) -> List[Dict]:
    sorts = {
        SortField.RELEVANCE: [{"_score": "desc"}, {"ad_boost_score": "desc"}],
        SortField.PRICE_ASC: [{"price": {"order": "asc", "missing": "_last"}}],
        SortField.PRICE_DESC: [{"price": {"order": "desc", "missing": "_last"}}],
        SortField.RATING: [{"rating": {"order": "desc", "missing": "_last"}}],
        SortField.NEWEST: [{"indexed_at": "desc"}],
        SortField.DISCOUNT: [{"discount_percent": {"order": "desc", "missing": "_last"}}],
    }
    return sorts.get(sort, sorts[SortField.RELEVANCE])


def _build_query(req: SearchRequest) -> Dict:
    filters = []
    if req.in_stock_only:
        filters.append({"term": {"in_stock": True}})
    if req.min_price is not None or req.max_price is not None:
        price_range = {}
        if req.min_price is not None:
            price_range["gte"] = req.min_price
        if req.max_price is not None:
            price_range["lte"] = req.max_price
        filters.append({"range": {"price": price_range}})
    if req.brands:
        filters.append({"terms": {"brand.keyword": req.brands}})
    if req.categories:
        filters.append({"terms": {"category.keyword": req.categories}})
    if req.min_rating is not None:
        filters.append({"range": {"rating": {"gte": req.min_rating}}})
    if req.site_ids:
        filters.append({"terms": {"site_id": req.site_ids}})

    query = {
        "function_score": {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": req.q,
                                "fields": ["name^3", "name.autocomplete^2", "brand^2", "category", "description"],
                                "type": "best_fields",
                                "fuzziness": "AUTO",
                                "operator": "or",
                            }
                        }
                    ],
                    "filter": filters,
                }
            },
            "functions": [
                {
                    "field_value_factor": {
                        "field": "ad_boost_score",
                        "factor": settings.ADS_BOOST_MULTIPLIER,
                        "modifier": "log1p",
                        "missing": 0,
                    }
                },
                {
                    "field_value_factor": {
                        "field": "rating",
                        "factor": 0.1,
                        "modifier": "log1p",
                        "missing": 0,
                    }
                },
            ],
            "score_mode": "sum",
            "boost_mode": "multiply",
        }
    }
    return query


def _build_aggs() -> Dict:
    return {
        "brands": {"terms": {"field": "brand.keyword", "size": 20}},
        "categories": {"terms": {"field": "category.keyword", "size": 20}},
        "sites": {"terms": {"field": "site_id", "size": 10}},
        "price_ranges": {
            "range": {
                "field": "price",
                "ranges": [
                    {"to": 25}, {"from": 25, "to": 50}, {"from": 50, "to": 100},
                    {"from": 100, "to": 250}, {"from": 250, "to": 500}, {"from": 500},
                ],
            }
        },
        "price_stats": {"stats": {"field": "price"}},
        "in_stock": {"filter": {"term": {"in_stock": True}}},
        "out_of_stock": {"filter": {"term": {"in_stock": False}}},
    }


def _map_hit(hit: Dict) -> ProductSearchResult:
    src = hit["_source"]
    return ProductSearchResult(
        id=hit["_id"],
        site_id=src.get("site_id", ""),
        site_domain=src.get("site_domain", ""),
        url=src.get("url", ""),
        name=src.get("name", ""),
        description=src.get("description"),
        brand=src.get("brand"),
        category=src.get("category"),
        price=src.get("price"),
        original_price=src.get("original_price"),
        currency=src.get("currency"),
        discount_percent=src.get("discount_percent"),
        in_stock=src.get("in_stock", True),
        rating=src.get("rating"),
        review_count=src.get("review_count"),
        images=src.get("images", []),
        sku=src.get("sku"),
        is_sponsored=src.get("is_sponsored", False),
        relevance_score=hit.get("_score"),
        highlight=hit.get("highlight"),
    )


class SearchService:
    def __init__(self, cache: Optional[CacheManager] = None):
        self.cache = cache

    async def search(self, req: SearchRequest) -> SearchResponse:
        start = time.monotonic()
        cache_key = None

        if self.cache:
            cache_key = "search:" + hashlib.md5(json.dumps(req.model_dump(), default=str).encode()).hexdigest()
            cached = await self.cache.get(cache_key)
            if cached:
                cached["took_ms"] = int((time.monotonic() - start) * 1000)
                return SearchResponse(**cached)

        es = await get_es()
        from_offset = (req.page - 1) * req.page_size
        query = _build_query(req)
        sort = _build_sort(req.sort)
        aggs = _build_aggs()

        body = {
            "query": query,
            "sort": sort,
            "aggs": aggs,
            "from": from_offset,
            "size": req.page_size,
            "highlight": {
                "fields": {"name": {}, "description": {"fragment_size": 150, "number_of_fragments": 1}},
                "pre_tags": ["<em>"],
                "post_tags": ["</em>"],
            },
            "track_total_hits": True,
        }

        response = await es.search(index=settings.ES_INDEX_PRODUCTS, body=body)
        hits = response["hits"]
        total = hits["total"]["value"]
        agg_data = response.get("aggregations", {})

        results = [_map_hit(hit) for hit in hits["hits"]]
        sponsored_count = sum(1 for r in results if r.is_sponsored)

        facets = SearchFacets(
            brands=[SearchFacet(key=b["key"], count=b["doc_count"]) for b in agg_data.get("brands", {}).get("buckets", [])],
            categories=[SearchFacet(key=c["key"], count=c["doc_count"]) for c in agg_data.get("categories", {}).get("buckets", [])],
            price_ranges=[SearchFacet(key=f"{r.get('from', 0)}-{r.get('to', '∞')}", count=r["doc_count"]) for r in agg_data.get("price_ranges", {}).get("buckets", [])],
            sites=[SearchFacet(key=s["key"], count=s["doc_count"]) for s in agg_data.get("sites", {}).get("buckets", [])],
            in_stock_count=agg_data.get("in_stock", {}).get("doc_count", 0),
            out_of_stock_count=agg_data.get("out_of_stock", {}).get("doc_count", 0),
        )

        price_stats_data = agg_data.get("price_stats", {})
        price_stats = PriceStats(
            min=price_stats_data.get("min"),
            max=price_stats_data.get("max"),
            avg=price_stats_data.get("avg"),
        )

        import math
        result = SearchResponse(
            query=req.q,
            total=total,
            page=req.page,
            page_size=req.page_size,
            total_pages=math.ceil(total / req.page_size) if req.page_size else 0,
            results=results,
            facets=facets,
            price_stats=price_stats,
            sponsored_count=sponsored_count,
            took_ms=int((time.monotonic() - start) * 1000),
        )

        if self.cache and cache_key:
            await self.cache.set(cache_key, result.model_dump(), ttl=settings.REDIS_SEARCH_CACHE_TTL)

        return result

    async def autocomplete(self, q: str, limit: int = 10) -> AutocompleteResponse:
        es = await get_es()
        body = {
            "suggest": {
                "product_suggest": {
                    "prefix": q,
                    "completion": {"field": "name.autocomplete", "size": limit, "skip_duplicates": True},
                }
            },
            "_source": ["name", "brand", "category"],
            "size": 0,
        }
        try:
            response = await es.search(index=settings.ES_INDEX_PRODUCTS, body=body)
            options = response.get("suggest", {}).get("product_suggest", [{}])[0].get("options", [])
            suggestions = [
                AutocompleteResult(text=opt["_source"].get("name", opt["text"]), type="product")
                for opt in options
            ]
        except Exception:
            suggestions = []

        return AutocompleteResponse(query=q, suggestions=suggestions)

    async def compare_products(self, product_ids: List[str]) -> CompareResponse:
        es = await get_es()
        docs = await es.mget(index=settings.ES_INDEX_PRODUCTS, ids=product_ids)
        products = []
        # key -> set of unique string-casted values across all products
        attribute_values: Dict[str, set] = {}

        compare_keys = ["brand", "category", "sku", "currency", "in_stock", "rating", "review_count", "discount_percent"]

        for doc in docs.get("docs", []):
            if not doc.get("found"):
                continue
            product = _map_hit({"_id": doc["_id"], "_source": doc["_source"], "_score": None})
            src = doc["_source"]
            attrs = []
            for key in compare_keys:
                val = src.get(key)
                if val is not None:
                    attrs.append(ProductAttribute(name=key, value=val))
                    attribute_values.setdefault(key, set()).add(str(val))
            products.append(ProductCompareItem(product=product, attributes=attrs))

        # An attribute is "different" if it has more than one unique value across products
        # An attribute is "common" if all products share the same value
        diff_attributes = [k for k, vals in attribute_values.items() if len(vals) > 1]
        common_attributes = [k for k, vals in attribute_values.items() if len(vals) == 1]

        return CompareResponse(
            products=products,
            common_attributes=common_attributes,
            diff_attributes=diff_attributes,
        )

    async def get_trending(self, limit: int = 6) -> TrendingResponse:
        """Return trending search terms derived from top ES categories and brands."""
        try:
            es = await get_es()
            body = {
                "size": 0,
                "aggs": {
                    "categories": {"terms": {"field": "category.keyword", "size": limit}},
                    "brands": {"terms": {"field": "brand.keyword", "size": limit}},
                },
            }
            response = await es.search(index=settings.ES_INDEX_PRODUCTS, body=body)
            aggs = response.get("aggregations", {})
            cat_buckets = aggs.get("categories", {}).get("buckets", [])
            brand_buckets = aggs.get("brands", {}).get("buckets", [])

            def fmt_count(n: int) -> str:
                if n >= 1_000_000:
                    return f"{n // 1_000_000}M+"
                if n >= 1_000:
                    return f"{n // 1_000}K+"
                return str(n)

            trending: List[TrendingItem] = []
            half = limit // 2
            for b in cat_buckets[:half]:
                if b["key"]:
                    trending.append(TrendingItem(query=b["key"], category=b["key"], count=fmt_count(b["doc_count"])))
            for b in brand_buckets[:limit - half]:
                if b["key"]:
                    trending.append(TrendingItem(query=b["key"], category="Products", count=fmt_count(b["doc_count"])))
            return TrendingResponse(trending=trending[:limit])
        except Exception:
            return TrendingResponse(trending=[])

    async def get_categories(self, limit: int = 20) -> CategoriesResponse:
        """Return top product categories from Elasticsearch."""
        try:
            es = await get_es()
            body = {
                "size": 0,
                "aggs": {
                    "categories": {"terms": {"field": "category.keyword", "size": limit}},
                },
            }
            response = await es.search(index=settings.ES_INDEX_PRODUCTS, body=body)
            buckets = response.get("aggregations", {}).get("categories", {}).get("buckets", [])
            categories = [b["key"] for b in buckets if b.get("key")]
            return CategoriesResponse(categories=categories)
        except Exception:
            return CategoriesResponse(categories=[])


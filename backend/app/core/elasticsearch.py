from elasticsearch import AsyncElasticsearch
from app.core.config import settings
from typing import Optional
import structlog

logger = structlog.get_logger()

_es_client: Optional[AsyncElasticsearch] = None

PRODUCT_INDEX_MAPPING = {
    "settings": {
        "number_of_shards": settings.ES_SHARDS,
        "number_of_replicas": settings.ES_REPLICAS,
        "analysis": {
            "analyzer": {
                "product_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding", "stop"],
                },
                "autocomplete_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "edge_ngram_filter"],
                },
            },
            "filter": {
                "edge_ngram_filter": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 20,
                }
            },
        },
    },
    "mappings": {
        "properties": {
            "site_id": {"type": "keyword"},
            "site_domain": {"type": "keyword"},
            "page_id": {"type": "keyword"},
            "url": {"type": "keyword"},
            "name": {
                "type": "text",
                "analyzer": "product_analyzer",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "autocomplete": {"type": "text", "analyzer": "autocomplete_analyzer"},
                },
            },
            "description": {"type": "text", "analyzer": "product_analyzer"},
            "brand": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "category": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            },
            "price": {"type": "float"},
            "original_price": {"type": "float"},
            "currency": {"type": "keyword"},
            "discount_percent": {"type": "float"},
            "in_stock": {"type": "boolean"},
            "rating": {"type": "float"},
            "review_count": {"type": "integer"},
            "images": {"type": "keyword"},
            "sku": {"type": "keyword"},
            "ad_boost_score": {"type": "float"},
            "is_sponsored": {"type": "boolean"},
            "indexed_at": {"type": "date"},
            "updated_at": {"type": "date"},
        }
    },
}

PAGE_INDEX_MAPPING = {
    "settings": {
        "number_of_shards": settings.ES_SHARDS,
        "number_of_replicas": settings.ES_REPLICAS,
    },
    "mappings": {
        "properties": {
            "site_id": {"type": "keyword"},
            "url": {"type": "keyword"},
            "title": {"type": "text"},
            "description": {"type": "text"},
            "page_type": {"type": "keyword"},
            "is_indexed": {"type": "boolean"},
            "indexed_at": {"type": "date"},
        }
    },
}


async def get_es() -> AsyncElasticsearch:
    global _es_client
    if _es_client is None:
        kwargs = {"hosts": [settings.ELASTICSEARCH_URL]}
        if settings.ELASTICSEARCH_USERNAME:
            kwargs["basic_auth"] = (settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD)
        _es_client = AsyncElasticsearch(**kwargs)
    return _es_client


async def close_es():
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None


async def init_es_indices():
    es = await get_es()
    for index_name, mapping in [
        (settings.ES_INDEX_PRODUCTS, PRODUCT_INDEX_MAPPING),
        (settings.ES_INDEX_PAGES, PAGE_INDEX_MAPPING),
    ]:
        exists = await es.indices.exists(index=index_name)
        if not exists:
            await es.indices.create(index=index_name, body=mapping)
            logger.info("ES index created", index=index_name)
        else:
            logger.info("ES index already exists", index=index_name)


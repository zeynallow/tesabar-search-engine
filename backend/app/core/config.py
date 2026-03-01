from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Tesabar Search Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-in-production-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tesabar:tesabar_pass@localhost:5432/tesabar_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # 5 minutes
    REDIS_SEARCH_CACHE_TTL: int = 60  # 1 minute for search

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_USERNAME: str = ""
    ELASTICSEARCH_PASSWORD: str = ""
    ES_INDEX_PRODUCTS: str = "tesabar_products"
    ES_INDEX_PAGES: str = "tesabar_pages"
    ES_SHARDS: int = 3
    ES_REPLICAS: int = 1

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    CRAWLER_CONCURRENCY: int = 10
    CRAWL_DELAY_SECONDS: float = 0.5
    MAX_SITEMAP_URLS: int = 50000

    # Crawler
    CRAWLER_USER_AGENT: str = "TesabarBot/1.0 (+https://tesabar.az/bot)"
    CRAWLER_TIMEOUT: int = 30
    CRAWLER_MAX_RETRIES: int = 3

    # Ads
    ADS_BOOST_MULTIPLIER: float = 2.0
    MIN_BID_AMOUNT: float = 0.01

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Admin
    ADMIN_EMAIL: str = "admin@tesabar.az"
    ADMIN_PASSWORD: str = "change-this-admin-password"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "tesabar",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks.fetch_sitemap_task": {"queue": "sitemap"},
        "app.workers.tasks.crawl_url_task": {"queue": "crawl"},
        "app.workers.tasks.crawl_site_batch_task": {"queue": "crawl"},
        "app.workers.tasks.bulk_index_es_task": {"queue": "indexing"},
        "app.workers.tasks.verify_site_domain_task": {"queue": "verification"},
        "app.workers.tasks.update_ad_boosts_task": {"queue": "ads"},
        "app.workers.tasks.auto_manage_campaigns_task": {"queue": "ads"},
    },
    beat_schedule={
        "bulk-index-es-every-5-min": {
            "task": "app.workers.tasks.bulk_index_es_task",
            "schedule": 300.0,
        },
        "update-ad-boosts-every-10-min": {
            "task": "app.workers.tasks.update_ad_boosts_task",
            "schedule": 600.0,
        },
        "auto-manage-campaigns-every-5-min": {
            "task": "app.workers.tasks.auto_manage_campaigns_task",
            "schedule": 300.0,
        },
    },
)


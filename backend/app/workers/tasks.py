import asyncio
from typing import List
from app.workers.celery_app import celery_app
from app.core.config import settings
import structlog

logger = structlog.get_logger()


def run_async(coro):
    """Run async coroutine from sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _get_db_session():
    from app.core.database import AsyncSessionLocal
    return AsyncSessionLocal()


@celery_app.task(name="app.workers.tasks.fetch_sitemap_task", bind=True, max_retries=3)
def fetch_sitemap_task(self, sitemap_id: str):
    """Fetch sitemap XML and create crawl jobs for all discovered URLs."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.repositories.site import SitemapRepository
        from app.repositories.indexing import IndexedPageRepository, IndexingJobRepository
        from app.models.site import SitemapStatus
        from app.models.indexing import IndexingJob, JobStatus, IndexedPage, PageStatus
        from app.services.sitemap_parser import fetch_and_parse_sitemap
        import uuid
        from datetime import datetime, timezone

        async with AsyncSessionLocal() as db:
            sitemap_repo = SitemapRepository(db)
            page_repo = IndexedPageRepository(db)
            job_repo = IndexingJobRepository(db)

            sitemap = await sitemap_repo.get_by_id(uuid.UUID(sitemap_id))
            if not sitemap:
                logger.warning("Sitemap not found", sitemap_id=sitemap_id)
                return

            await sitemap_repo.update(sitemap, status=SitemapStatus.FETCHING)

            try:
                result = await fetch_and_parse_sitemap(sitemap.url)

                if result.error:
                    await sitemap_repo.update(sitemap, status=SitemapStatus.FAILED, error_message=result.error)
                    logger.error("Sitemap fetch failed", url=sitemap.url, error=result.error)
                    return

                # Create IndexedPage entries for new URLs
                new_pages = []
                for url in result.urls:
                    if not await page_repo.url_exists(sitemap.site_id, url):
                        new_pages.append(IndexedPage(
                            site_id=sitemap.site_id,
                            url=url,
                            status=PageStatus.PENDING,
                        ))

                if new_pages:
                    await page_repo.bulk_create(new_pages)

                # Create an indexing job
                job = IndexingJob(
                    site_id=sitemap.site_id,
                    sitemap_id=sitemap.id,
                    status=JobStatus.QUEUED,
                    job_type="sitemap_fetch",
                    total_urls=len(result.urls),
                )
                job = await job_repo.create(job)

                await sitemap_repo.update(
                    sitemap,
                    status=SitemapStatus.FETCHED,
                    last_fetched_at=datetime.now(timezone.utc),
                    url_count=result.url_count,
                    error_message=None,
                )
                await db.commit()

                # Queue batch crawl tasks
                crawl_site_batch_task.delay(str(sitemap.site_id), str(job.id))
                logger.info("Sitemap fetched", url=sitemap.url, urls=result.url_count)

            except Exception as e:
                await sitemap_repo.update(sitemap, status=SitemapStatus.FAILED, error_message=str(e))
                await db.commit()
                raise self.retry(exc=e, countdown=60)

    run_async(_run())


@celery_app.task(name="app.workers.tasks.crawl_site_batch_task", bind=True, max_retries=2)
def crawl_site_batch_task(self, site_id: str, job_id: str, batch_size: int = 50):
    """Crawl pending pages for a site in batches."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.repositories.indexing import IndexedPageRepository, IndexingJobRepository
        from app.models.indexing import JobStatus, PageStatus
        from app.services.crawler import WebCrawler, create_crawler_session
        from app.services.indexer import IndexerService
        import uuid
        from datetime import datetime, timezone

        async with AsyncSessionLocal() as db:
            page_repo = IndexedPageRepository(db)
            job_repo = IndexingJobRepository(db)
            indexer = IndexerService(db)

            job = await job_repo.get_by_id(uuid.UUID(job_id))
            if job:
                await job_repo.update(job, status=JobStatus.RUNNING, started_at=datetime.now(timezone.utc))

            pages = await page_repo.get_pending_for_crawl(limit=batch_size)
            if not pages:
                if job:
                    await job_repo.update(job, status=JobStatus.COMPLETED, finished_at=datetime.now(timezone.utc))
                await db.commit()
                return

            session = await create_crawler_session()
            crawler = WebCrawler(session)

            try:
                processed = 0
                failed = 0
                for page in pages:
                    try:
                        await page_repo.update(page, status=PageStatus.CRAWLING)
                        result = await crawler.crawl(page.url)
                        await indexer.process_crawl_result(uuid.UUID(site_id), result)
                        processed += 1
                        await asyncio.sleep(settings.CRAWL_DELAY_SECONDS)
                    except Exception as e:
                        failed += 1
                        logger.error("Page crawl failed", url=page.url, error=str(e))

                if job:
                    remaining = await page_repo.count_by_site(uuid.UUID(site_id), status=PageStatus.PENDING)
                    await job_repo.update(
                        job,
                        processed_urls=job.processed_urls + processed,
                        failed_urls=job.failed_urls + failed,
                        status=JobStatus.COMPLETED if remaining == 0 else JobStatus.RUNNING,
                        finished_at=datetime.now(timezone.utc) if remaining == 0 else None,
                    )

                await db.commit()

                # If more pages remain, queue another batch
                if remaining > 0:
                    crawl_site_batch_task.apply_async(
                        args=[site_id, job_id, batch_size],
                        countdown=5,
                    )

            finally:
                await session.close()

    run_async(_run())


@celery_app.task(name="app.workers.tasks.crawl_url_task", bind=True, max_retries=3)
def crawl_url_task(self, site_id: str, url: str):
    """Crawl a single URL on demand."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.services.crawler import WebCrawler, create_crawler_session
        from app.services.indexer import IndexerService
        import uuid

        async with AsyncSessionLocal() as db:
            indexer = IndexerService(db)
            session = await create_crawler_session()
            crawler = WebCrawler(session)
            try:
                result = await crawler.crawl(url)
                await indexer.process_crawl_result(uuid.UUID(site_id), result)
                await db.commit()
                logger.info("URL crawled", url=url)
            finally:
                await session.close()

    try:
        run_async(_run())
    except Exception as e:
        raise self.retry(exc=e, countdown=30)


@celery_app.task(name="app.workers.tasks.bulk_index_es_task")
def bulk_index_es_task():
    """Bulk index products to Elasticsearch."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.services.indexer import IndexerService

        async with AsyncSessionLocal() as db:
            indexer = IndexerService(db)
            count = await indexer.bulk_index_products_to_es(limit=1000)
            await db.commit()
            if count > 0:
                logger.info("Bulk ES indexed", count=count)

    run_async(_run())


@celery_app.task(name="app.workers.tasks.update_ad_boosts_task")
def update_ad_boosts_task():
    """Sync ad boost scores to Elasticsearch."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.services.ads import AdsService

        async with AsyncSessionLocal() as db:
            ads_service = AdsService(db)
            await ads_service.update_es_ad_boosts()

    run_async(_run())


@celery_app.task(name="app.workers.tasks.verify_site_domain_task", bind=True, max_retries=5)
def verify_site_domain_task(self, site_id: str, method: str):
    """Verify site domain ownership via DNS TXT or meta tag."""
    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.repositories.site import SiteRepository
        from app.models.site import SiteStatus
        import uuid
        import aiohttp
        from bs4 import BeautifulSoup

        async with AsyncSessionLocal() as db:
            site_repo = SiteRepository(db)
            site = await site_repo.get_by_id(uuid.UUID(site_id))
            if not site or site.is_domain_verified:
                return

            token = site.verification_token
            verified = False

            if method == "meta_tag":
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"https://{site.domain}", timeout=aiohttp.ClientTimeout(total=30)) as resp:
                            html = await resp.text()
                            soup = BeautifulSoup(html, "lxml")
                            meta = soup.find("meta", attrs={"name": "tesabar-site-verification"})
                            if meta and meta.get("content") == token:
                                verified = True
                except Exception as e:
                    raise self.retry(exc=e, countdown=120)

            if verified:
                await site_repo.update(site, is_domain_verified=True, status=SiteStatus.ACTIVE)
                await db.commit()
                logger.info("Domain verified", domain=site.domain, method=method)
            else:
                raise self.retry(exc=Exception("Verification failed"), countdown=300)

    run_async(_run())


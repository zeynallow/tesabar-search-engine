import aiohttp
import asyncio
from typing import List, Tuple
from xml.etree import ElementTree as ET
import gzip
import io
from app.core.config import settings
import structlog

logger = structlog.get_logger()

SITEMAP_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
}

HEADERS = {
    "User-Agent": settings.CRAWLER_USER_AGENT,
    "Accept-Encoding": "gzip",
}


class SitemapParseResult:
    def __init__(self, url: str):
        self.url = url
        self.urls: List[str] = []
        self.sub_sitemaps: List[str] = []
        self.detected_type: str = "unknown"
        self.error: str = None
        self.url_count: int = 0


async def fetch_sitemap_content(session: aiohttp.ClientSession, url: str) -> Tuple[bytes, str]:
    async with session.get(
        url,
        headers=HEADERS,
        timeout=aiohttp.ClientTimeout(total=60),
        allow_redirects=True,
    ) as response:
        response.raise_for_status()
        content = await response.read()
        content_type = response.headers.get("content-type", "")

        # Handle gzipped content
        if url.endswith(".gz") or "gzip" in content_type:
            content = gzip.decompress(content)

        return content, content_type


def parse_sitemap_xml(content: bytes, base_url: str) -> SitemapParseResult:
    result = SitemapParseResult(base_url)
    try:
        root = ET.fromstring(content)
        tag = root.tag.lower()

        if "sitemapindex" in tag:
            result.detected_type = "sitemap_index"
            for sitemap in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                url = sitemap.text.strip() if sitemap.text else ""
                if url:
                    result.sub_sitemaps.append(url)

        elif "urlset" in tag:
            result.detected_type = "url_set"
            for loc in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                url = loc.text.strip() if loc.text else ""
                if url:
                    result.urls.append(url)
            result.url_count = len(result.urls)

        else:
            result.error = "Unknown sitemap format"

    except ET.ParseError as e:
        result.error = f"XML parse error: {str(e)}"
    except Exception as e:
        result.error = f"Parse error: {str(e)}"

    return result


async def fetch_and_parse_sitemap(url: str, max_urls: int = None) -> SitemapParseResult:
    if max_urls is None:
        max_urls = settings.MAX_SITEMAP_URLS

    connector = aiohttp.TCPConnector(limit=5, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            content, _ = await fetch_sitemap_content(session, url)
            result = parse_sitemap_xml(content, url)

            if result.detected_type == "sitemap_index" and result.sub_sitemaps:
                # Recursively fetch sub-sitemaps
                all_urls = []
                tasks = [
                    fetch_sitemap_content(session, sub_url)
                    for sub_url in result.sub_sitemaps[:50]  # max 50 sub sitemaps
                ]
                sub_results = await asyncio.gather(*tasks, return_exceptions=True)

                for sub_url, sub_result in zip(result.sub_sitemaps, sub_results):
                    if isinstance(sub_result, Exception):
                        logger.warning("Sub-sitemap fetch failed", url=sub_url, error=str(sub_result))
                        continue
                    sub_content, _ = sub_result
                    parsed = parse_sitemap_xml(sub_content, sub_url)
                    if not parsed.error:
                        all_urls.extend(parsed.urls)
                        if len(all_urls) >= max_urls:
                            break

                result.urls = all_urls[:max_urls]
                result.url_count = len(result.urls)

            return result

        except aiohttp.ClientError as e:
            r = SitemapParseResult(url)
            r.error = f"HTTP error: {str(e)}"
            return r
        except Exception as e:
            r = SitemapParseResult(url)
            r.error = f"Error: {str(e)}"
            return r


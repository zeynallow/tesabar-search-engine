import asyncio
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urljoin, urlparse
import aiohttp
from bs4 import BeautifulSoup
from app.core.config import settings
import structlog
import json
import re

logger = structlog.get_logger()

HEADERS = {
    "User-Agent": settings.CRAWLER_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}


class CrawlResult:
    def __init__(self, url: str):
        self.url = url
        self.status_code: Optional[int] = None
        self.title: Optional[str] = None
        self.meta_description: Optional[str] = None
        self.canonical_url: Optional[str] = None
        self.is_indexed: bool = True
        self.structured_data: List[Dict] = []
        self.response_headers: Dict[str, str] = {}
        self.page_type: str = "other"
        self.product_data: Optional[Dict[str, Any]] = None
        self.seo_issues: List[Dict[str, str]] = []
        self.error: Optional[str] = None


class SEOAnalyzer:
    @staticmethod
    def analyze(soup: BeautifulSoup, url: str, status_code: int) -> List[Dict[str, str]]:
        issues = []
        title_tag = soup.find("title")
        if not title_tag or not title_tag.get_text(strip=True):
            issues.append({"type": "missing_title", "severity": "error",
                           "message": "Page is missing a title tag",
                           "recommendation": "Add a descriptive title tag to the page"})
        elif len(title_tag.get_text(strip=True)) > 60:
            issues.append({"type": "title_too_long", "severity": "warning",
                           "message": "Title tag exceeds 60 characters",
                           "recommendation": "Keep the title under 60 characters"})
        elif len(title_tag.get_text(strip=True)) < 30:
            issues.append({"type": "title_too_short", "severity": "warning",
                           "message": "Title tag is too short (under 30 characters)",
                           "recommendation": "Write a more descriptive title"})

        meta_desc = soup.find("meta", attrs={"name": "description"})
        if not meta_desc or not meta_desc.get("content"):
            issues.append({"type": "missing_meta_description", "severity": "warning",
                           "message": "Page is missing a meta description",
                           "recommendation": "Add a meta description between 120-160 characters"})
        elif meta_desc.get("content") and len(meta_desc.get("content", "")) > 160:
            issues.append({"type": "meta_description_too_long", "severity": "warning",
                           "message": "Meta description exceeds 160 characters"})

        h1_tags = soup.find_all("h1")
        if not h1_tags:
            issues.append({"type": "missing_h1", "severity": "warning",
                           "message": "Page is missing an H1 tag"})
        elif len(h1_tags) > 1:
            issues.append({"type": "multiple_h1", "severity": "warning",
                           "message": f"Page has {len(h1_tags)} H1 tags - should have only one"})

        canonical = soup.find("link", attrs={"rel": "canonical"})
        if canonical and canonical.get("href") and canonical.get("href") != url:
            issues.append({"type": "canonical_mismatch", "severity": "info",
                           "message": "Canonical URL differs from page URL",
                           "recommendation": "Ensure canonical points to the correct URL"})

        noindex = soup.find("meta", attrs={"name": "robots", "content": re.compile(r"noindex", re.I)})
        if noindex:
            issues.append({"type": "noindex", "severity": "error",
                           "message": "Page has noindex meta tag - will not be indexed"})

        images = soup.find_all("img")
        imgs_without_alt = [img for img in images if not img.get("alt")]
        if imgs_without_alt:
            issues.append({"type": "images_missing_alt", "severity": "warning",
                           "message": f"{len(imgs_without_alt)} images are missing alt text"})

        return issues


class ProductExtractor:
    @staticmethod
    def extract_from_schema_org(structured_data: List[Dict]) -> Optional[Dict[str, Any]]:
        for item in structured_data:
            if isinstance(item, dict):
                item_type = item.get("@type", "")
                if isinstance(item_type, str) and "Product" in item_type:
                    return ProductExtractor._parse_product_schema(item)
                elif isinstance(item_type, list) and "Product" in item_type:
                    return ProductExtractor._parse_product_schema(item)
        return None

    @staticmethod
    def _parse_product_schema(schema: Dict) -> Dict[str, Any]:
        product = {
            "name": schema.get("name"),
            "description": schema.get("description"),
            "sku": schema.get("sku"),
            "brand": None,
            "price": None,
            "original_price": None,
            "currency": None,
            "in_stock": True,
            "rating": None,
            "review_count": None,
            "images": [],
            "category": schema.get("category"),
        }
        brand = schema.get("brand")
        if isinstance(brand, dict):
            product["brand"] = brand.get("name")
        elif isinstance(brand, str):
            product["brand"] = brand

        offers = schema.get("offers")
        if isinstance(offers, dict):
            product["price"] = _safe_float(offers.get("price"))
            product["currency"] = offers.get("priceCurrency")
            availability = offers.get("availability", "")
            product["in_stock"] = "InStock" in str(availability)
        elif isinstance(offers, list) and offers:
            offer = offers[0]
            product["price"] = _safe_float(offer.get("price"))
            product["currency"] = offer.get("priceCurrency")

        agg_rating = schema.get("aggregateRating")
        if isinstance(agg_rating, dict):
            product["rating"] = _safe_float(agg_rating.get("ratingValue"))
            product["review_count"] = _safe_int(agg_rating.get("reviewCount"))

        image = schema.get("image")
        if isinstance(image, str):
            product["images"] = [image]
        elif isinstance(image, list):
            product["images"] = image[:5]

        return product


def _safe_float(val: Any) -> Optional[float]:
    try:
        return float(str(val).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _safe_int(val: Any) -> Optional[int]:
    try:
        return int(str(val).strip())
    except (TypeError, ValueError):
        return None


class WebCrawler:
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session

    async def crawl(self, url: str) -> CrawlResult:
        result = CrawlResult(url)
        try:
            async with self.session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=settings.CRAWLER_TIMEOUT), allow_redirects=True, max_redirects=5) as response:
                result.status_code = response.status
                result.response_headers = dict(response.headers)

                if response.status != 200:
                    result.error = f"HTTP {response.status}"
                    return result

                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    result.error = f"Non-HTML content type: {content_type}"
                    return result

                html = await response.text(errors="replace")
                soup = BeautifulSoup(html, "lxml")

                result.title = (soup.find("title") or BeautifulSoup("", "lxml")).get_text(strip=True) if soup.find("title") else None
                meta_desc = soup.find("meta", attrs={"name": "description"})
                result.meta_description = meta_desc.get("content") if meta_desc else None
                canonical = soup.find("link", attrs={"rel": "canonical"})
                result.canonical_url = canonical.get("href") if canonical else None

                robots_meta = soup.find("meta", attrs={"name": "robots"})
                if robots_meta and "noindex" in str(robots_meta.get("content", "")).lower():
                    result.is_indexed = False

                for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
                    try:
                        data = json.loads(script.string or "{}")
                        if isinstance(data, list):
                            result.structured_data.extend(data)
                        elif isinstance(data, dict):
                            result.structured_data.append(data)
                    except json.JSONDecodeError:
                        pass

                product_data = ProductExtractor.extract_from_schema_org(result.structured_data)
                if product_data and product_data.get("name"):
                    result.product_data = product_data
                    result.page_type = "product"

                result.seo_issues = SEOAnalyzer.analyze(soup, url, result.status_code)

        except asyncio.TimeoutError:
            result.error = "Request timed out"
        except aiohttp.ClientError as e:
            result.error = f"HTTP client error: {str(e)}"
        except Exception as e:
            result.error = f"Unexpected error: {str(e)}"
            logger.exception("Crawl error", url=url)

        return result


async def create_crawler_session() -> aiohttp.ClientSession:
    connector = aiohttp.TCPConnector(limit=settings.CRAWLER_CONCURRENCY, ttl_dns_cache=300)
    return aiohttp.ClientSession(connector=connector)


import redis.asyncio as aioredis
from app.core.config import settings
from typing import Optional, Any
import orjson
import structlog

logger = structlog.get_logger()

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis_pool


async def close_redis():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


class CacheManager:
    def __init__(self, redis: aioredis.Redis):
        self.redis = redis

    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        if value:
            return orjson.loads(value)
        return None

    async def set(self, key: str, value: Any, ttl: int = settings.REDIS_CACHE_TTL):
        await self.redis.setex(key, ttl, orjson.dumps(value).decode())

    async def delete(self, key: str):
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

    async def increment(self, key: str, ttl: int = 3600) -> int:
        val = await self.redis.incr(key)
        if val == 1:
            await self.redis.expire(key, ttl)
        return val

    async def set_add(self, key: str, *values: str, ttl: int = 3600):
        await self.redis.sadd(key, *values)
        await self.redis.expire(key, ttl)

    async def set_members(self, key: str) -> set:
        return await self.redis.smembers(key)

    async def publish(self, channel: str, message: Any):
        await self.redis.publish(channel, orjson.dumps(message).decode())


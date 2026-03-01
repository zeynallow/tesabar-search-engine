from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core.redis_client import get_redis, close_redis
from app.core.elasticsearch import init_es_indices, close_es
from app.core.exceptions import AppException
from app.core.security import hash_password
from app.api.v1.router import api_router
from app.models.user import User
from app.repositories.user import UserRepository
import structlog
import time

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Tesabar Search Engine", version=settings.APP_VERSION)

    # Initialize Elasticsearch indices
    try:
        await init_es_indices()
        logger.info("Elasticsearch indices ready")
    except Exception as e:
        logger.warning("Elasticsearch init failed", error=str(e))

    # Warm up Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning("Redis init failed", error=str(e))

    # Seed admin user
    try:
        async with AsyncSessionLocal() as session:
            user_repo = UserRepository(session)
            existing = await user_repo.get_by_email(settings.ADMIN_EMAIL)
            if not existing:
                admin = User(
                    email=settings.ADMIN_EMAIL.lower(),
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    full_name="Admin",
                    is_admin=True,
                    is_active=True,
                    is_verified=True,
                )
                session.add(admin)
                await session.commit()
                logger.info("Admin user created", email=settings.ADMIN_EMAIL)
            else:
                logger.info("Admin user already exists", email=settings.ADMIN_EMAIL)
    except Exception as e:
        logger.warning("Admin seed failed", error=str(e))

    yield

    # Shutdown
    logger.info("Shutting down Tesabar Search Engine")
    await close_es()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)
        response.headers["X-Process-Time-Ms"] = str(duration_ms)
        return response

    # Global exception handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "error_code": exc.error_code},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"},
        )

    # Include all API routes
    app.include_router(api_router)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()


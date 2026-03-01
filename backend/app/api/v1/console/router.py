from fastapi import APIRouter
from app.api.v1.console import auth, sites, sitemaps, indexing, ads

router = APIRouter(prefix="/console")
router.include_router(auth.router)
router.include_router(sites.router)
router.include_router(sitemaps.router)
router.include_router(indexing.router)
router.include_router(ads.router)


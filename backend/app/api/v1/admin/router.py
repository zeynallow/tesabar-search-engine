from fastapi import APIRouter
from app.api.v1.admin import sites, users, indexing

router = APIRouter(prefix="/admin")
router.include_router(sites.router)
router.include_router(users.router)
router.include_router(indexing.router)


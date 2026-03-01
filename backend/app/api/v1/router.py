from fastapi import APIRouter
from app.api.v1.console.router import router as console_router
from app.api.v1.search.router import router as search_router
from app.api.v1.admin.router import router as admin_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(console_router)
api_router.include_router(search_router)
api_router.include_router(admin_router)


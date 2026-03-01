from fastapi import APIRouter
from app.api.v1.search import search

router = APIRouter()
router.include_router(search.router)


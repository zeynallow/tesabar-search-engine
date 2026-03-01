from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, List
from datetime import datetime
import uuid

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(cls, items: List[T], total: int, page: int, page_size: int):
        import math
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if page_size > 0 else 0,
        )


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
    errors: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None


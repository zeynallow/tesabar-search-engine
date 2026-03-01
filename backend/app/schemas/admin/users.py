from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class AdminUserListResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    company_name: Optional[str]
    is_active: bool
    is_admin: bool
    is_verified: bool
    sites_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_verified: Optional[bool] = None


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    is_admin: bool = False


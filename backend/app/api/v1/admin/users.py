from fastapi import APIRouter, Query
from typing import Optional
from app.api.deps import CurrentAdmin, DB
from app.schemas.admin.users import (
    AdminUserListResponse, AdminUserUpdateRequest, AdminCreateUserRequest,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.repositories.user import UserRepository
from app.repositories.site import SiteRepository
from app.services.auth import AuthService
from app.schemas.auth import RegisterRequest
from app.core.exceptions import NotFoundError
import uuid

router = APIRouter(prefix="/users", tags=["Admin - Users"])


@router.get("", response_model=PaginatedResponse[AdminUserListResponse])
async def list_users(
    current_admin: CurrentAdmin,
    db: DB,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """List all users."""
    user_repo = UserRepository(db)
    site_repo = SiteRepository(db)

    if search:
        users = await user_repo.search_users(search, skip=skip, limit=limit)
    else:
        users = await user_repo.get_all(skip=skip, limit=limit)

    total = await user_repo.count()
    items = []
    for user in users:
        site_count = await site_repo.count_by_owner(user.id)
        items.append(AdminUserListResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            company_name=user.company_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            is_verified=user.is_verified,
            sites_count=site_count,
            created_at=user.created_at,
        ))

    return PaginatedResponse.create(items=items, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/{user_id}", response_model=AdminUserListResponse)
async def get_user(user_id: uuid.UUID, current_admin: CurrentAdmin, db: DB):
    """Get user details."""
    user_repo = UserRepository(db)
    site_repo = SiteRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    site_count = await site_repo.count_by_owner(user_id)
    return AdminUserListResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        sites_count=site_count,
        created_at=user.created_at,
    )


@router.patch("/{user_id}", response_model=MessageResponse)
async def update_user(user_id: uuid.UUID, data: AdminUserUpdateRequest, current_admin: CurrentAdmin, db: DB):
    """Update user account status."""
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    update_data = data.model_dump(exclude_none=True)
    await user_repo.update(user, **update_data)
    return MessageResponse(message="User updated")


@router.post("", response_model=MessageResponse, status_code=201)
async def create_user(data: AdminCreateUserRequest, current_admin: CurrentAdmin, db: DB):
    """Admin create a new user account."""
    service = AuthService(db)
    await service.register(RegisterRequest(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        company_name=data.company_name,
    ))
    if data.is_admin:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_email(data.email)
        if user:
            await user_repo.update(user, is_admin=True, is_verified=True)
    return MessageResponse(message="User created successfully")


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(user_id: uuid.UUID, current_admin: CurrentAdmin, db: DB):
    """Delete a user account."""
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    await user_repo.delete(user)
    return MessageResponse(message="User deleted")


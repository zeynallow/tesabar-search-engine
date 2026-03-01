from fastapi import APIRouter, Request
from app.api.deps import CurrentUser, DB
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest,
    UserResponse, ChangePasswordRequest,
)
from app.schemas.common import MessageResponse
from app.services.auth import AuthService
from app.core.security import hash_password, verify_password
from app.repositories.user import UserRepository
from app.core.exceptions import InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["Console - Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: DB):
    """Register a new console user."""
    service = AuthService(db)
    user = await service.register(data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DB):
    """Login and receive JWT tokens."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: DB):
    """Refresh access token using refresh token."""
    service = AuthService(db)
    return await service.refresh_tokens(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/verify-email/{token}", response_model=MessageResponse)
async def verify_email(token: str, db: DB):
    """Verify email address with verification token."""
    service = AuthService(db)
    await service.verify_email(token)
    return MessageResponse(message="Email verified successfully")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(data: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    """Change password for current user."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise InvalidCredentialsError()
    repo = UserRepository(db)
    await repo.update(current_user, password_hash=hash_password(data.new_password))
    return MessageResponse(message="Password changed successfully")


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, db: DB):
    """Invalidate refresh token."""
    repo = UserRepository(db)
    await repo.update(current_user, refresh_token_hash=None)
    return MessageResponse(message="Logged out successfully")


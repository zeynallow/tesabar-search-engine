from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.models.user import User
from app.repositories.user import UserRepository
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, generate_verification_token,
)
from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsError, AlreadyExistsError, NotFoundError, PermissionDeniedError
)
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
import structlog

logger = structlog.get_logger()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> User:
        if await self.user_repo.email_exists(data.email):
            raise AlreadyExistsError("User", "email")

        verification_token = generate_verification_token()
        user = User(
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            company_name=data.company_name,
            verification_token=verification_token,
            is_verified=False,
        )
        user = await self.user_repo.create(user)
        logger.info("User registered", user_id=str(user.id), email=user.email)
        return user

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise PermissionDeniedError("Account is inactive")

        access_token = create_access_token(
            subject=str(user.id),
            extra_data={"is_admin": user.is_admin},
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        await self.user_repo.update(user, refresh_token_hash=hash_password(refresh_token))
        logger.info("User logged in", user_id=str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise InvalidCredentialsError()

        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise InvalidCredentialsError()

        if not user.refresh_token_hash or not verify_password(refresh_token, user.refresh_token_hash):
            raise InvalidCredentialsError()

        new_access = create_access_token(str(user.id), {"is_admin": user.is_admin})
        new_refresh = create_refresh_token(str(user.id))
        await self.user_repo.update(user, refresh_token_hash=hash_password(new_refresh))

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def verify_email(self, token: str) -> User:
        user = await self.user_repo.get_by_verification_token(token)
        if not user:
            raise NotFoundError("Verification token")
        return await self.user_repo.update(user, is_verified=True, verification_token=None)

    async def get_current_user(self, token: str) -> User:
        from app.core.exceptions import CREDENTIALS_EXCEPTION
        payload = decode_token(token)
        if not payload:
            raise CREDENTIALS_EXCEPTION
        user = await self.user_repo.get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise CREDENTIALS_EXCEPTION
        return user


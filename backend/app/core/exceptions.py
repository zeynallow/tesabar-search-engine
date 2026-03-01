from typing import Any
from fastapi import HTTPException, status


class TesabarException(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "ERROR"):
        self.message = message
        self.status_code = status_code
        self.detail = message
        self.error_code = error_code
        super().__init__(message)


# Alias for use in main.py exception handlers
AppException = TesabarException


class NotFoundError(TesabarException):
    def __init__(self, resource: str, identifier: Any = None):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(msg, 404)


class AlreadyExistsError(TesabarException):
    def __init__(self, resource: str, field: str = ""):
        msg = f"{resource} already exists"
        if field:
            msg = f"{resource} with this {field} already exists"
        super().__init__(msg, 409)


class PermissionDeniedError(TesabarException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, 403)


class InvalidCredentialsError(TesabarException):
    def __init__(self):
        super().__init__("Invalid credentials", 401)


class DomainVerificationError(TesabarException):
    def __init__(self, message: str = "Domain verification failed"):
        super().__init__(message, 422)


class CrawlerError(TesabarException):
    def __init__(self, message: str):
        super().__init__(message, 422)


class QuotaExceededError(TesabarException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} quota exceeded", 429)


def http_error(status_code: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=detail)


CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

PERMISSION_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Insufficient permissions",
)


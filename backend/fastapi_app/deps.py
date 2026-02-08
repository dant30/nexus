"""
Shared FastAPI dependencies.
These are injected into route handlers via Depends().
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from starlette.requests import Request

from fastapi_app.middleware.auth import TokenManager
from shared.utils.logger import log_error, get_logger

logger = get_logger("deps")


class CurrentUser:
    """Dependency to get current authenticated user."""
    
    def __init__(self, user_id: Optional[int] = None, username: Optional[str] = None):
        """Initialize user context."""
        self.user_id = user_id
        self.username = username


async def get_current_user(request: Request) -> CurrentUser:
    """
    Extract current user from request.
    Raises 401 if not authenticated.
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
        
        payload = TokenManager.verify_token(token)
        user_id = int(payload.get("sub"))
        username = payload.get("username")
        
        if not user_id:
            raise ValueError("Missing user_id in token")
        
        return CurrentUser(user_id=user_id, username=username)
        
    except ValueError as e:
        log_error(f"Invalid authorization token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(request: Request) -> Optional[CurrentUser]:
    """
    Optionally extract user from request.
    Returns None if no valid token provided (doesn't raise error).
    """
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# Database dependency (for later)
async def get_db():
    """
    Get database session.
    For now, Django ORM is already set up globally.
    """
    from django.db import connection
    try:
        yield connection
    finally:
        connection.close()

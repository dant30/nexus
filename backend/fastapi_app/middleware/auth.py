"""
JWT Authentication middleware for FastAPI.
Validates and extracts user information from JWT tokens.
"""
from typing import Optional, Tuple
from datetime import datetime, timedelta
import jwt
from functools import lru_cache

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.authentication import (
    AuthenticationBackend,
    AuthenticationError,
    SimpleUser,
)
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.requests import Request

from fastapi_app.config import settings
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("auth")
security = HTTPBearer()


class JWTAuthMiddleware(AuthenticationBackend):
    """Custom JWT authentication middleware."""
    
    def __init__(self):
        """Initialize the middleware."""
        self.algorithm = settings.JWT_ALGORITHM
        self.secret_key = settings.SECRET_KEY
    
    async def authenticate(self, request: Request) -> Optional[Tuple[bool, SimpleUser]]:
        """
        Authenticate request by extracting and validating JWT from Authorization header.
        
        Returns:
        - (True, user) if valid
        - (False, AnonymousUser) if no token or invalid
        """
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            return None
        
        try:
            # Extract bearer token
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                return None
            
            # Verify and decode JWT
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
            )
            
            user_id = payload.get("sub")
            username = payload.get("username")
            
            if not user_id:
                log_error("Invalid JWT payload: missing 'sub'")
                return None
            
            # Create authenticated user
            return SimpleUser(username=username or f"user_{user_id}")
            
        except jwt.ExpiredSignatureError:
            log_error("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            log_error(f"Invalid JWT token: {str(e)}")
            return None
        except ValueError:
            log_error("Invalid Authorization header format")
            return None


class TokenManager:
    """Manage JWT token generation and validation."""
    
    @staticmethod
    def create_token(
        subject: int,
        username: str,
        expires_in: Optional[int] = None,
    ) -> str:
        """
        Create a JWT token.
        
        Args:
        - subject: User ID
        - username: Username
        - expires_in: Token expiration time in seconds (default: 1 hour)
        
        Returns:
        - JWT token string
        """
        if expires_in is None:
            expires_in = settings.JWT_EXPIRATION
        
        expires = datetime.utcnow() + timedelta(seconds=expires_in)
        
        payload = {
            "sub": str(subject),
            "username": username,
            "exp": expires,
            "iat": datetime.utcnow(),
        }
        
        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        
        log_info(f"JWT token created", user_id=subject, expires_in=expires_in)
        return token
    
    @staticmethod
    def create_refresh_token(subject: int, username: str) -> str:
        """Create a refresh token with longer expiration."""
        return TokenManager.create_token(
            subject=subject,
            username=username,
            expires_in=settings.JWT_REFRESH_EXPIRATION,
        )
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """
        Verify and decode a JWT token.
        
        Args:
        - token: JWT token string
        
        Returns:
        - Decoded payload dict
        
        Raises:
        - jwt.ExpiredSignatureError
        - jwt.InvalidTokenError
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except jwt.ExpiredSignatureError:
            log_error("Token expired")
            raise
        except jwt.InvalidTokenError as e:
            log_error(f"Invalid token: {str(e)}")
            raise
    
    @staticmethod
    def extract_user_id(token: str) -> Optional[int]:
        """Extract user_id from token."""
        try:
            payload = TokenManager.verify_token(token)
            return int(payload.get("sub"))
        except Exception:
            return None


# Dependency for protected routes
async def get_current_user(request: Request) -> dict:
    """
    Dependency to extract current authenticated user.
    Use in route: async def my_route(current_user = Depends(get_current_user))
    """
    # Will be set by AuthenticationMiddleware
    if not request.user or not request.user.is_authenticated:
        raise AuthenticationError("Not authenticated")
    
    return {"username": request.user.username}

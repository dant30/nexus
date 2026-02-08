"""
Pydantic schemas for OAuth requests and responses.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class OAuthAuthorizationUrl(BaseModel):
    """OAuth authorization URL response."""
    authorization_url: str
    provider: str


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request from frontend."""
    code: str
    state: Optional[str] = None


class OAuthTokenResponse(BaseModel):
    """OAuth token response."""
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class OAuthUserResponse(BaseModel):
    """OAuth user information response."""
    id: int
    username: str
    email: str
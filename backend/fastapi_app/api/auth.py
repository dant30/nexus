"""
Authentication routes for FastAPI.
Handles login, token refresh, logout, and Deriv OAuth.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field

import django
django.setup()

from django.contrib.auth import authenticate, get_user_model
from fastapi_app.middleware.auth import TokenManager
from fastapi_app.deps import get_current_user, CurrentUser
from fastapi_app.config import settings
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("auth")
User = get_user_model()

router = APIRouter(tags=["Authentication"])


# ============================================================================
# Request/Response Models
# ============================================================================
class LoginRequest(BaseModel):
    """Login request payload."""
    username: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=4, max_length=128)


class TokenResponse(BaseModel):
    """Token response with user info."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class SignupRequest(BaseModel):
    """User signup request."""
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=4, max_length=128)
    referred_by: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """Change password request."""
    old_password: str
    new_password: str = Field(..., min_length=4, max_length=128)


# ============================================================================
# Endpoints
# ============================================================================
@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with username and password.
    
    Returns:
    - access_token: JWT for authenticated requests (1 hour)
    - refresh_token: JWT for token refresh (7 days)
    - user: User profile data
    """
    try:
        # Django authentication
        user = authenticate(username=request.username, password=request.password)
        
        if not user:
            log_error(f"Login failed: invalid credentials for {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        
        if not user.is_active:
            log_error(f"Login failed: user {request.username} is inactive")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        # Generate tokens
        access_token = TokenManager.create_token(user.id, user.username)
        refresh_token = TokenManager.create_refresh_token(user.id, user.username)
        
        log_info(f"User logged in", user_id=user.id, username=user.username)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_EXPIRATION,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "affiliate_code": getattr(user, "affiliate_code", None),
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("Login error", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh an expired access token.
    
    Requires valid refresh_token (7 days lifetime).
    Returns new access_token (1 hour) + same refresh_token.
    """
    try:
        payload = TokenManager.verify_token(request.refresh_token)
        user_id = int(payload.get("sub"))
        username = payload.get("username")
        
        if not user_id or not username:
            raise ValueError("Invalid token payload")
        
        # Generate new access token
        access_token = TokenManager.create_token(user_id, username)
        
        log_info(f"Token refreshed", user_id=user_id)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=request.refresh_token,  # Return same refresh token
            expires_in=settings.JWT_EXPIRATION,
            user={"id": user_id, "username": username},
        )
        
    except Exception as e:
        log_error("Token refresh failed", exception=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )


@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest):
    """
    Create a new user account.
    
    Automatically:
    - Creates affiliate code
    - Creates demo account with $10K
    - Assigns referral if code provided
    """
    try:
        # Check if user exists
        if User.objects.filter(username=request.username).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        
        if User.objects.filter(email=request.email).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Create user
        user = User.objects.create_user(
            username=request.username,
            email=request.email,
            password=request.password,
        )
        
        # Generate affiliate code (via signal)
        user.refresh_from_db()
        
        # Handle referral
        if request.referred_by:
            from django_core.referrals.services import register_referral
            try:
                register_referral(request.referred_by, user)
                log_info(f"Referral registered", user_id=user.id, code=request.referred_by)
            except Exception as e:
                log_error(f"Referral registration failed", exception=e)
                # Don't fail signup, just skip referral
        
        # Generate tokens
        access_token = TokenManager.create_token(user.id, user.username)
        refresh_token = TokenManager.create_refresh_token(user.id, user.username)
        
        log_info(f"New user signed up", user_id=user.id, username=user.username)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_EXPIRATION,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "affiliate_code": getattr(user, "affiliate_code", None),
            },
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("Signup error", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed",
        )


@router.post("/logout")
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """
    Logout (client should discard tokens).
    
    In a production system, you might:
    - Blacklist the token
    - Invalidate refresh token
    - Close WebSocket connections
    """
    log_info(f"User logged out", user_id=current_user.user_id)
    
    return {
        "success": True,
        "message": "Logged out successfully",
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Change user password."""
    try:
        user = User.objects.get(id=current_user.user_id)
        
        # Verify old password
        if not user.check_password(request.old_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid current password",
            )
        
        # Set new password
        user.set_password(request.new_password)
        user.save()
        
        log_info(f"Password changed", user_id=user.id)
        
        return {
            "success": True,
            "message": "Password changed successfully",
        }
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Password change failed", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password",
        )


@router.get("/me")
async def get_current_user_profile(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user's profile."""
    try:
        user = User.objects.get(id=current_user.user_id)
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "affiliate_code": getattr(user, "affiliate_code", None),
            "markup_percentage": float(getattr(user, "markup_percentage", 0)),
            "created_at": user.created_at.isoformat() if hasattr(user, "created_at") else None,
        }
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch user profile", exception=e)
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@router.post("/oauth/authorize")
async def oauth_authorize(deriv_code: str):
    """
    Deriv OAuth callback handler.
    
    Exchange Deriv authorization code for tokens.
    """
    try:
        # TODO: Implement Deriv OAuth
        # 1. Exchange code for Deriv access token
        # 2. Fetch Deriv user info
        # 3. Create/update local user
        # 4. Return JWT tokens
        
        log_info("Deriv OAuth callback received", code_length=len(deriv_code))
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Deriv OAuth not yet implemented",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("OAuth error", exception=e)
        raise HTTPException(status_code=500, detail="OAuth failed")

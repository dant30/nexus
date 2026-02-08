"""
OAuth integration routes for Deriv.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

import django
django.setup()

from django.contrib.auth import get_user_model
from fastapi_app.oauth.deriv_oauth import DerivOAuthClient
from fastapi_app.middleware.auth import TokenManager
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("oauth_routes")
User = get_user_model()

router = APIRouter(tags=["OAuth"])


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request."""
    code: str
    state: Optional[str] = None


@router.get("/deriv/authorize")
async def get_deriv_authorization_url():
    """
    Get Deriv OAuth authorization URL.
    Frontend should redirect to this URL.
    """
    try:
        oauth_client = DerivOAuthClient()
        auth_url = oauth_client.get_authorization_url()
        
        return {
            "authorization_url": auth_url,
            "provider": "deriv",
        }
    
    except Exception as e:
        log_error("Failed to generate OAuth URL", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate OAuth URL",
        )


@router.post("/deriv/callback")
async def deriv_oauth_callback(request: OAuthCallbackRequest):
    """
    Handle Deriv OAuth callback.
    Exchange code for token and create/update user.
    """
    try:
        oauth_client = DerivOAuthClient()
        
        # Exchange code for token
        token_data = await oauth_client.exchange_code(request.code)
        
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to exchange authorization code",
            )
        
        access_token = token_data.get("access_token")
        
        # Get user info from Deriv
        user_info = await oauth_client.get_user_info(access_token)
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to fetch user information",
            )
        
        # Create or update user
        deriv_id = user_info.get("id")
        email = user_info.get("email")
        username = user_info.get("username", f"deriv_{deriv_id}")
        
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
            },
        )
        
        if not created:
            user.email = email
            user.save()
        
        # Generate JWT tokens
        access_jwt = TokenManager.create_token(user.id, user.username)
        refresh_jwt = TokenManager.create_refresh_token(user.id, user.username)
        
        log_info(
            "OAuth callback successful",
            user_id=user.id,
            deriv_id=deriv_id,
            created=created,
        )
        
        return {
            "success": True,
            "access_token": access_jwt,
            "refresh_token": refresh_jwt,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
        }
    
    except HTTPException:
        raise
    except Exception as e:
        log_error("OAuth callback error", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth callback failed",
        )

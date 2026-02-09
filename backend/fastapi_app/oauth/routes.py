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
    code: Optional[str] = None
    token: Optional[str] = None
    account_id: Optional[str] = None
    currency: Optional[str] = None
    state: Optional[str] = None


def _extract_oauth_payload(
    code: Optional[str],
    token: Optional[str],
    account_id: Optional[str],
    currency: Optional[str],
) -> OAuthCallbackRequest:
    return OAuthCallbackRequest(
        code=code,
        token=token,
        account_id=account_id,
        currency=currency,
    )


async def _handle_oauth_callback(payload: OAuthCallbackRequest):
    oauth_client = DerivOAuthClient()

    access_token = None
    if payload.code:
        token_data = await oauth_client.exchange_code(payload.code)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to exchange authorization code",
            )
        access_token = token_data.get("access_token")
    elif payload.token:
        access_token = payload.token
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code or token",
        )

    # Get user info from Deriv (best effort)
    user_info = await oauth_client.get_user_info(access_token)

    deriv_id = None
    email = None
    username = None

    if user_info:
        deriv_id = user_info.get("id") or user_info.get("loginid")
        email = user_info.get("email")
        username = user_info.get("username") or user_info.get("loginid")

    if not username:
        fallback_id = payload.account_id or deriv_id or "unknown"
        username = f"deriv_{fallback_id}"

    if not email:
        email = f"{username}@deriv.local"

    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": email},
    )

    if not created:
        if email and user.email != email:
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
        return await _handle_oauth_callback(request)
    
    except HTTPException:
        raise
    except Exception as e:
        log_error("OAuth callback error", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth callback failed",
        )


@router.get("/deriv/callback")
async def deriv_oauth_callback_get(
    code: Optional[str] = None,
    token: Optional[str] = None,
    account_id: Optional[str] = None,
    acct1: Optional[str] = None,
    token1: Optional[str] = None,
    currency: Optional[str] = None,
    cur1: Optional[str] = None,
):
    """
    Handle Deriv OAuth callback via GET (for providers that redirect with query params).
    """
    try:
        payload = _extract_oauth_payload(
            code=code,
            token=token1 or token,
            account_id=acct1 or account_id,
            currency=cur1 or currency,
        )
        return await _handle_oauth_callback(payload)
    except HTTPException:
        raise
    except Exception as e:
        log_error("OAuth callback GET error", exception=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth callback failed",
        )

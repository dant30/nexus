"""
OAuth integration routes for Deriv.
"""
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from asgiref.sync import sync_to_async
from decimal import Decimal

import django
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django_core.accounts.models import Account
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
    accounts: Optional[List[dict]] = None


def _to_bool(value) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return None


def _infer_account_type(account: dict) -> str:
    account_type = account.get("account_type")
    if account_type:
        return str(account_type).lower()
    loginid = account.get("loginid") or account.get("account_id") or account.get("account")
    is_virtual = _to_bool(account.get("is_virtual"))
    if is_virtual is True or (isinstance(loginid, str) and loginid.startswith("VRT")):
        return "virtual"
    return "real"


def _select_default_account(account_list: list, primary_login_id: Optional[str]) -> tuple[Optional[dict], list]:
    if not account_list:
        return None, []

    normalized = []
    types = []
    for account in account_list:
        account_type = _infer_account_type(account)
        is_virtual = _to_bool(account.get("is_virtual"))
        if is_virtual is None:
            is_virtual = account_type == "virtual"
        normalized.append({**account, "account_type": account_type, "is_virtual": is_virtual})
        if account_type not in types:
            types.append(account_type)

    if primary_login_id:
        for account in normalized:
            if str(account.get("loginid")) == str(primary_login_id):
                return account, types

    for account in normalized:
        if account.get("is_virtual"):
            return account, types
    return normalized[0], types


def _login_id_is_virtual(login_id: Optional[str]) -> Optional[bool]:
    if not login_id:
        return None
    login_id = str(login_id)
    return login_id.startswith("VRT")


def _extract_oauth_payload(
    code: Optional[str],
    token: Optional[str],
    account_id: Optional[str],
    currency: Optional[str],
    accounts: Optional[List[dict]] = None,
) -> OAuthCallbackRequest:
    return OAuthCallbackRequest(
        code=code,
        token=token,
        account_id=account_id,
        currency=currency,
        accounts=accounts,
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
    login_id = None
    email = None
    username = None
    currency = payload.currency
    full_name = None
    first_name = None
    last_name = None
    email_verified = None
    deriv_country = None
    deriv_account_type = None
    deriv_is_virtual = None
    primary_balance = None

    if user_info:
        deriv_id = user_info.get("user_id") or user_info.get("id")
        login_id = user_info.get("loginid") or user_info.get("login_id")
        email = user_info.get("email")
        currency = currency or user_info.get("currency")
        full_name = user_info.get("fullname") or user_info.get("full_name") or user_info.get("name")
        first_name = user_info.get("first_name")
        last_name = user_info.get("last_name")
        username = user_info.get("username") or login_id
        email_verified = _to_bool(
            user_info.get("is_email_verified")
            or user_info.get("email_verified")
        )
        deriv_country = user_info.get("country")
        primary_balance = user_info.get("balance")

        account_list = user_info.get("account_list") or []
        default_account, account_types = _select_default_account(account_list, login_id)
        if default_account:
            login_id = login_id or default_account.get("loginid")
            currency = currency or default_account.get("currency")
            deriv_is_virtual = default_account.get("is_virtual")

        if account_types:
            if "virtual" in account_types:
                deriv_account_type = "virtual"
                deriv_is_virtual = True if deriv_is_virtual is None else deriv_is_virtual
            else:
                deriv_account_type = account_types[0]
            if len(account_types) > 1:
                deriv_account_type = ",".join(account_types)

    if not username:
        fallback_id = payload.account_id or login_id or deriv_id or "unknown"
        username = f"deriv_{fallback_id}"

    if not email:
        email = f"{username}@deriv.local"

    if full_name and (not first_name or not last_name):
        parts = [part for part in str(full_name).strip().split(" ") if part]
        if parts:
            first_name = first_name or parts[0]
            if len(parts) > 1:
                last_name = last_name or " ".join(parts[1:])

    # Resolve existing local user by strongest identifiers first to avoid
    # creating a second non-admin OAuth user for an existing admin email.
    user = None
    created = False

    if deriv_id:
        user = await sync_to_async(User.objects.filter(deriv_id=str(deriv_id)).first)()

    if not user and email:
        user = await sync_to_async(User.objects.filter(email=email).first)()

    if not user and username:
        user = await sync_to_async(User.objects.filter(username=username).first)()

    if user:
        created = False
        if email and user.email != email:
            email_taken = await sync_to_async(
                User.objects.filter(email=email).exclude(id=user.id).exists
            )()
            if not email_taken:
                user.email = email
    else:
        user = await sync_to_async(User.objects.create)(
            username=username,
            email=email,
        )
        created = True

    # Map Deriv fields onto user profile
    if deriv_id:
        user.deriv_id = str(deriv_id)
    if login_id:
        user.deriv_login_id = str(login_id)
    if currency:
        user.deriv_currency = str(currency)
    if full_name:
        user.deriv_full_name = str(full_name)
    if email_verified is not None:
        user.deriv_email_verified = bool(email_verified)
    if deriv_country:
        user.deriv_country = str(deriv_country)
    if deriv_account_type:
        user.deriv_account_type = str(deriv_account_type)
    inferred_virtual = _login_id_is_virtual(login_id)
    if inferred_virtual is not None:
        user.deriv_is_virtual = bool(inferred_virtual)
    elif deriv_is_virtual is not None:
        user.deriv_is_virtual = bool(deriv_is_virtual)

    if first_name:
        user.first_name = str(first_name)
    if last_name:
        user.last_name = str(last_name)

    await sync_to_async(user.save)()

    # Sync Deriv accounts into local accounts table
    account_list = user_info.get("account_list") if user_info else []
    payload_accounts = payload.accounts or []
    if account_list:
        await sync_to_async(Account.objects.filter(user=user, is_default=True).update)(is_default=False)

        has_default = False
        for account in account_list:
            account_login_id = account.get("loginid") or account.get("account_id")
            if not account_login_id:
                continue

            token_match = next(
                (acc for acc in payload_accounts if str(acc.get("account_id")) == str(account_login_id)),
                None,
            )
            account_token = token_match.get("token") if token_match else None

            is_virtual = _to_bool(account.get("is_virtual"))
            if is_virtual is None:
                is_virtual = _login_id_is_virtual(account_login_id) or False

            account_type = Account.TYPE_DEMO if is_virtual else Account.TYPE_REAL
            account_currency = account.get("currency") or currency or "USD"
            account_balance = account.get("balance")
            if account_balance is None and login_id and str(account_login_id) == str(login_id):
                account_balance = primary_balance
            if account_balance is None:
                account_balance = "0"

            is_default = False
            if login_id and str(account_login_id) == str(login_id):
                is_default = True
                has_default = True

            await sync_to_async(Account.objects.update_or_create)(
                user=user,
                account_id=str(account_login_id),
                defaults={
                    "account_type": account_type,
                    "currency": str(account_currency),
                    "balance": Decimal(str(account_balance)),
                    "metadata": {
                        **(account or {}),
                        "token": account_token,
                    },
                    "is_default": is_default,
                    "markup_percentage": getattr(user, "markup_percentage", 0),
                },
            )

        if not has_default:
            first_account = account_list[0]
            fallback_login_id = first_account.get("loginid") or first_account.get("account_id")
            if fallback_login_id:
                await sync_to_async(Account.objects.filter(user=user, account_id=str(fallback_login_id)).update)(
                    is_default=True
                )

    # Store full account list + tokens on user
    if account_list or payload_accounts:
        merged_accounts = []
        for account in account_list:
            account_login_id = account.get("loginid") or account.get("account_id")
            token_match = next(
                (acc for acc in payload_accounts if str(acc.get("account_id")) == str(account_login_id)),
                None,
            )
            merged_accounts.append(
                {
                    **(account or {}),
                    "account_id": account_login_id,
                    "token": token_match.get("token") if token_match else None,
                }
            )
        if not merged_accounts:
            merged_accounts = payload_accounts
        user.deriv_accounts = merged_accounts

    if access_token:
        user.deriv_access_token = access_token

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
            "is_staff": bool(getattr(user, "is_staff", False)),
            "is_superuser": bool(getattr(user, "is_superuser", False)),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "deriv_id": user.deriv_id,
            "deriv_login_id": user.deriv_login_id,
            "deriv_currency": user.deriv_currency,
            "deriv_full_name": user.deriv_full_name,
            "deriv_email_verified": user.deriv_email_verified,
            "deriv_country": user.deriv_country,
            "deriv_account_type": user.deriv_account_type,
            "deriv_is_virtual": user.deriv_is_virtual,
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
    request: Request,
    code: Optional[str] = None,
    token: Optional[str] = None,
    account_id: Optional[str] = None,
    acct1: Optional[str] = None,
    token1: Optional[str] = None,
    currency: Optional[str] = None,
    cur1: Optional[str] = None,
    acct2: Optional[str] = None,
    token2: Optional[str] = None,
    cur2: Optional[str] = None,
):
    """
    Handle Deriv OAuth callback via GET (query params).
    """
    try:
        accounts = []
        if acct1 and token1:
            accounts.append({"account_id": acct1, "token": token1, "currency": cur1})
        if acct2 and token2:
            accounts.append({"account_id": acct2, "token": token2, "currency": cur2})
        payload = _extract_oauth_payload(
            code=code,
            token=token1 or token,
            account_id=acct1 or account_id,
            currency=cur1 or currency,
            accounts=accounts or None,
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

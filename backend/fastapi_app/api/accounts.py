"""
Trading account management routes.
Handles demo/real accounts, balances, and Deriv integration.
"""
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from asgiref.sync import sync_to_async

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.accounts.models import Account
from django_core.accounts.selectors import get_user_accounts, get_default_account
from django_core.accounts.services import create_demo_account, create_or_update_real_account
from fastapi_app.deps import get_current_user, CurrentUser
from fastapi_app.oauth.deriv_oauth import DerivOAuthClient
from shared.utils.logger import log_info, log_error, get_logger
from fastapi_app.deriv_ws.handlers import broadcast_balance_update

logger = get_logger("accounts")
User = get_user_model()

router = APIRouter(tags=["Accounts"])


# ============================================================================
# Request/Response Models
# ============================================================================
class AccountResponse(BaseModel):
    """Account response."""
    id: int
    deriv_account_id: Optional[str]
    account_type: str
    currency: str
    balance: str
    is_default: bool
    markup_percentage: str
    created_at: str


class CreateDemoAccountRequest(BaseModel):
    """Create demo account."""
    currency: str = "USD"
    initial_balance: str = Field("10000.00")


class SetDefaultAccountRequest(BaseModel):
    """Set account as default."""
    account_id: int


# ============================================================================
# Endpoints
# ============================================================================
@router.get("/", response_model=List[AccountResponse])
async def list_accounts(current_user: CurrentUser = Depends(get_current_user)):
    """List all accounts for current user."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        accounts = await sync_to_async(list)(get_user_accounts(user))
        
        return [
            AccountResponse(
                id=acc.id,
                deriv_account_id=acc.deriv_account_id,
                account_type=acc.account_type,
                currency=acc.currency,
                balance=str(acc.balance),
                is_default=acc.is_default,
                markup_percentage=str(acc.markup_percentage),
                created_at=acc.created_at.isoformat(),
            )
            for acc in accounts
        ]
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch accounts", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/default", response_model=AccountResponse)
async def get_default_account_endpoint(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's default account."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        account = await sync_to_async(get_default_account)(user)
        
        if not account:
            raise HTTPException(status_code=404, detail="No default account")
        
        return AccountResponse(
            id=account.id,
            deriv_account_id=account.deriv_account_id,
            account_type=account.account_type,
            currency=account.currency,
            balance=str(account.balance),
            is_default=account.is_default,
            markup_percentage=str(account.markup_percentage),
            created_at=account.created_at.isoformat(),
        )
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Failed to fetch default account", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get specific account."""
    try:
        account = await sync_to_async(Account.objects.get)(
            id=account_id, user_id=current_user.user_id
        )
        
        return AccountResponse(
            id=account.id,
            deriv_account_id=account.deriv_account_id,
            account_type=account.account_type,
            currency=account.currency,
            balance=str(account.balance),
            is_default=account.is_default,
            markup_percentage=str(account.markup_percentage),
            created_at=account.created_at.isoformat(),
        )
        
    except Account.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    except Exception as e:
        log_error("Failed to fetch account", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/demo", response_model=AccountResponse)
async def create_demo_account_endpoint(
    request: CreateDemoAccountRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new demo account."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        # Create demo account
        account = await sync_to_async(create_demo_account)(
            user=user,
            currency=request.currency,
            initial_balance=Decimal(request.initial_balance),
        )
        
        log_info(
            "Demo account created",
            user_id=user.id,
            account_id=account.id,
            currency=request.currency,
        )
        
        return AccountResponse(
            id=account.id,
            deriv_account_id=account.deriv_account_id,
            account_type=account.account_type,
            currency=account.currency,
            balance=str(account.balance),
            is_default=account.is_default,
            markup_percentage=str(account.markup_percentage),
            created_at=account.created_at.isoformat(),
        )
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to create demo account", exception=e)
        raise HTTPException(status_code=500, detail="Creation failed")


@router.put("/{account_id}/default")
async def set_default_account(
    account_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Set an account as default."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        account = await sync_to_async(Account.objects.get)(id=account_id, user_id=user.id)
        
        # Unset previous default
        await sync_to_async(Account.objects.filter(user=user, is_default=True).update)(
            is_default=False
        )
        
        # Set new default
        account.is_default = True
        await sync_to_async(account.save)()
        
        log_info("Default account changed", user_id=user.id, account_id=account.id)
        
        return {
            "success": True,
            "message": f"Account {account_id} is now default",
        }
        
    except Account.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to set default account", exception=e)
        raise HTTPException(status_code=500, detail="Update failed")


@router.get("/{account_id}/balance")
async def get_account_balance(
    account_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get account balance (real-time from cache if available)."""
    try:
        account = await sync_to_async(Account.objects.get)(
            id=account_id, user_id=current_user.user_id
        )
        
        return {
            "account_id": account.id,
            "balance": str(account.balance),
            "currency": account.currency,
            "updated_at": account.updated_at.isoformat(),
        }
        
    except Account.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    except Exception as e:
        log_error("Failed to fetch balance", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/{account_id}/balance/live")
async def get_account_balance_live(
    account_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get live balance from Deriv using stored token."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        account = await sync_to_async(Account.objects.get)(
            id=account_id, user_id=current_user.user_id
        )

        token = None
        if account.metadata:
            token = account.metadata.get("token")
        if not token:
            token = getattr(user, "deriv_access_token", None)
        if not token:
            raise HTTPException(status_code=400, detail="Missing Deriv access token")

        oauth_client = DerivOAuthClient()
        balance_data = await oauth_client.get_balance(token)
        if not balance_data:
            raise HTTPException(status_code=502, detail="Failed to fetch live balance")

        balance_value = balance_data.get("balance")
        balance_currency = balance_data.get("currency") or account.currency

        if balance_value is not None:
            account.balance = Decimal(str(balance_value))
            account.currency = str(balance_currency)
            await sync_to_async(account.save)(
                update_fields=["balance", "currency", "updated_at"]
            )

        live_balance = float(account.balance)

        # Push to websockets (best-effort)
        try:
            broadcast_balance_update(account_id, live_balance)
        except Exception:
            # silent fail — keep endpoint behaviour unchanged
            pass

        return {
            "account_id": account.id,
            "balance": str(account.balance),
            "currency": account.currency,
            "updated_at": account.updated_at.isoformat(),
            "source": "deriv",
        }

    except Account.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Failed to fetch live balance", exception=e)
        raise HTTPException(status_code=500, detail="Server error")

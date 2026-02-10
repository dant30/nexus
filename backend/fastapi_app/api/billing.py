"""Billing & transactions routes."""
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from asgiref.sync import sync_to_async

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.billing.models import Transaction
from django_core.billing.selectors import get_user_transactions
from fastapi_app.deps import get_current_user, CurrentUser
from shared.utils.logger import log_error, get_logger

logger = get_logger("billing")
User = get_user_model()

router = APIRouter(tags=["Billing"])


class TransactionResponse(BaseModel):
    """Transaction response."""
    id: int
    tx_type: str
    amount: str
    status: str
    balance_after: Optional[str]
    created_at: str


@router.get("/transactions", response_model=List[TransactionResponse])
async def list_transactions(
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get transaction history."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        transactions = await sync_to_async(list)(get_user_transactions(user, limit=limit))
        
        return [
            TransactionResponse(
                id=tx.id,
                tx_type=tx.tx_type,
                amount=str(tx.amount),
                status=tx.status,
                balance_after=str(tx.balance_after) if tx.balance_after else None,
                created_at=tx.created_at.isoformat(),
            )
            for tx in transactions
        ]
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch transactions", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/balance")
async def get_total_balance(current_user: CurrentUser = Depends(get_current_user)):
    """Get total balance across all accounts."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        accounts = await sync_to_async(list)(user.accounts.all())
        total = sum(Decimal(acc.balance) for acc in accounts)
        
        return {"total_balance": str(total)}
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch balance", exception=e)
        raise HTTPException(status_code=500, detail="Server error")

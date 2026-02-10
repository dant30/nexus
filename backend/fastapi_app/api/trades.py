"""
Trade execution and history routes.
"""
from typing import Optional, List
from decimal import Decimal
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, condecimal, Field
from asgiref.sync import sync_to_async

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.trades.models import Trade
from django_core.trades.services import create_trade, close_trade
from django_core.trades.selectors import get_user_trades, get_open_trades
from django_core.accounts.selectors import get_default_account
from fastapi_app.deps import get_current_user, CurrentUser
from shared.utils.logger import log_info, log_error, get_logger
from shared.utils.ids import generate_proposal_id

logger = get_logger("trades")
User = get_user_model()

router = APIRouter(tags=["Trades"])


# ============================================================================
# Enums & Models
# ============================================================================
class ContractType(str, Enum):
    """Contract types."""
    CALL = "CALL"
    PUT = "PUT"


class Direction(str, Enum):
    """Trade direction."""
    RISE = "RISE"
    FALL = "FALL"


class TradeResponse(BaseModel):
    """Trade response."""
    id: int
    account_id: int
    contract_type: str
    direction: str
    stake: str
    payout: Optional[str]
    profit: Optional[str]
    proposal_id: Optional[str]
    transaction_id: Optional[str]
    duration_seconds: Optional[int]
    status: str
    commission_applied: str
    markup_applied: str
    created_at: str
    updated_at: str



class CreateTradeRequest(BaseModel):
    contract_type: ContractType
    direction: Direction
    stake: condecimal(max_digits=12, decimal_places=6)
    account_id: Optional[int] = None
    duration_seconds: Optional[int] = None

class CloseTradeRequest(BaseModel):
    payout: condecimal(max_digits=12, decimal_places=6)
    transaction_id: Optional[str] = None



# ============================================================================
# Endpoints
# ============================================================================
@router.post("/execute", response_model=TradeResponse)
async def execute_trade(
    request: CreateTradeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Execute a trade.
    
    Steps:
    1. Validate account & balance
    2. Apply commission & markup
    3. Create Trade record
    4. Emit to Deriv API
    5. Send WebSocket update
    """
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        # Get account
        if request.account_id:
            account = await sync_to_async(user.accounts.get)(id=request.account_id)
        else:
            account = await sync_to_async(get_default_account)(user)
        
        if not account:
            raise HTTPException(status_code=404, detail="No account found")
        
        stake = Decimal(request.stake)
        
        # Validate stake
        if stake < Decimal("0.35"):
            raise HTTPException(status_code=400, detail="Minimum stake is $0.35")
        if stake > account.balance:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Generate proposal ID
        proposal_id = generate_proposal_id()
        
        # Create trade record
        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=request.contract_type.value,
            direction=request.direction.value,
            stake=stake,
            account=account,
            duration_seconds=request.duration_seconds,
            proposal_id=proposal_id,
        )
        
        log_info(
            "Trade executed",
            user_id=user.id,
            trade_id=trade.id,
            stake=str(stake),
            direction=request.direction.value,
        )
        
        return TradeResponse(
            id=trade.id,
            account_id=trade.account_id,
            contract_type=trade.contract_type,
            direction=trade.direction,
            stake=str(trade.stake),
            payout=str(trade.payout) if trade.payout else None,
            profit=str(trade.profit) if trade.profit else None,
            proposal_id=trade.proposal_id,
            transaction_id=trade.transaction_id,
            duration_seconds=trade.duration_seconds,
            status=trade.status,
            commission_applied=str(trade.commission_applied),
            markup_applied=str(trade.markup_applied),
            created_at=trade.created_at.isoformat(),
            updated_at=trade.updated_at.isoformat(),
        )
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Trade execution failed", exception=e)
        raise HTTPException(status_code=500, detail="Trade execution failed")


@router.get("/", response_model=List[TradeResponse])
async def list_trades(
    limit: int = 50,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get user's trade history."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        trades = await sync_to_async(list)(get_user_trades(user, limit=limit + offset))
        
        return [
            TradeResponse(
                id=trade.id,
                account_id=trade.account_id,
                contract_type=trade.contract_type,
                direction=trade.direction,
                stake=str(trade.stake),
                payout=str(trade.payout) if trade.payout else None,
                profit=str(trade.profit) if trade.profit else None,
                proposal_id=trade.proposal_id,
                transaction_id=trade.transaction_id,
                duration_seconds=trade.duration_seconds,
                status=trade.status,
                commission_applied=str(trade.commission_applied),
                markup_applied=str(trade.markup_applied),
                created_at=trade.created_at.isoformat(),
                updated_at=trade.updated_at.isoformat(),
            )
            for trade in trades[offset:]
        ]
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch trades", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/open", response_model=List[TradeResponse])
async def list_open_trades(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's open trades."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        trades = await sync_to_async(list)(get_open_trades(user))
        
        return [
            TradeResponse(
                id=trade.id,
                account_id=trade.account_id,
                contract_type=trade.contract_type,
                direction=trade.direction,
                stake=str(trade.stake),
                payout=str(trade.payout) if trade.payout else None,
                profit=str(trade.profit) if trade.profit else None,
                proposal_id=trade.proposal_id,
                transaction_id=trade.transaction_id,
                duration_seconds=trade.duration_seconds,
                status=trade.status,
                commission_applied=str(trade.commission_applied),
                markup_applied=str(trade.markup_applied),
                created_at=trade.created_at.isoformat(),
                updated_at=trade.updated_at.isoformat(),
            )
            for trade in trades
        ]
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch open trades", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get specific trade details."""
    try:
        trade = await sync_to_async(Trade.objects.get)(
            id=trade_id, user_id=current_user.user_id
        )
        
        return TradeResponse(
            id=trade.id,
            account_id=trade.account_id,
            contract_type=trade.contract_type,
            direction=trade.direction,
            stake=str(trade.stake),
            payout=str(trade.payout) if trade.payout else None,
            profit=str(trade.profit) if trade.profit else None,
            proposal_id=trade.proposal_id,
            transaction_id=trade.transaction_id,
            duration_seconds=trade.duration_seconds,
            status=trade.status,
            commission_applied=str(trade.commission_applied),
            markup_applied=str(trade.markup_applied),
            created_at=trade.created_at.isoformat(),
            updated_at=trade.updated_at.isoformat(),
        )
        
    except Trade.DoesNotExist:
        raise HTTPException(status_code=404, detail="Trade not found")
    except Exception as e:
        log_error("Failed to fetch trade", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/{trade_id}/close", response_model=TradeResponse)
async def close_trade_endpoint(
    trade_id: int,
    request: CloseTradeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Close an open trade."""
    try:
        trade = await sync_to_async(Trade.objects.get)(
            id=trade_id, user_id=current_user.user_id
        )
        
        if trade.status != Trade.STATUS_OPEN:
            raise HTTPException(status_code=400, detail="Trade is not open")
        
        payout = Decimal(request.payout)
        
        # Close trade
        await sync_to_async(close_trade)(trade, payout, request.transaction_id)
        await sync_to_async(trade.refresh_from_db)()
        
        log_info(
            "Trade closed",
            user_id=current_user.user_id,
            trade_id=trade.id,
            payout=str(payout),
            profit=str(trade.profit),
        )
        
        return TradeResponse(
            id=trade.id,
            account_id=trade.account_id,
            contract_type=trade.contract_type,
            direction=trade.direction,
            stake=str(trade.stake),
            payout=str(trade.payout) if trade.payout else None,
            profit=str(trade.profit) if trade.profit else None,
            proposal_id=trade.proposal_id,
            transaction_id=trade.transaction_id,
            duration_seconds=trade.duration_seconds,
            status=trade.status,
            commission_applied=str(trade.commission_applied),
            markup_applied=str(trade.markup_applied),
            created_at=trade.created_at.isoformat(),
            updated_at=trade.updated_at.isoformat(),
        )
        
    except Trade.DoesNotExist:
        raise HTTPException(status_code=404, detail="Trade not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Failed to close trade", exception=e)
        raise HTTPException(status_code=500, detail="Close failed")


@router.get("/{trade_id}/profit")
async def get_trade_profit(
    trade_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Calculate trade profit/loss."""
    try:
        trade = await sync_to_async(Trade.objects.get)(
            id=trade_id, user_id=current_user.user_id
        )
        
        profit = trade.profit or Decimal("0")
        loss = -profit if profit < 0 else Decimal("0")
        
        return {
            "trade_id": trade.id,
            "stake": str(trade.stake),
            "payout": str(trade.payout) if trade.payout else "0",
            "profit": str(profit),
            "loss": str(loss),
            "roi": str((profit / trade.stake * 100)) if trade.stake > 0 else "0",
        }
        
    except Trade.DoesNotExist:
        raise HTTPException(status_code=404, detail="Trade not found")
    except Exception as e:
        log_error("Failed to calculate profit", exception=e)
        raise HTTPException(status_code=500, detail="Calculation failed")

"""
Trade execution and history routes.
"""
from typing import Optional, List
from decimal import Decimal
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, condecimal
from asgiref.sync import sync_to_async

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.trades.models import Trade
from django_core.trades.services import create_trade, close_trade
from django_core.trades.selectors import get_user_trades, get_open_trades
from django_core.accounts.selectors import get_default_account
from fastapi_app.deps import get_current_user, CurrentUser
from fastapi_app.deriv_ws.connection_pool import pool
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
    duration_unit: Optional[str] = None
    symbol: Optional[str] = None

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
    2. Request Deriv proposal
    3. Buy contract
    4. Create Trade record
    5. Monitor contract close
    """
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        # Enforce Rise/Fall (Call/Put) only
        if request.contract_type not in {ContractType.CALL, ContractType.PUT}:
            raise HTTPException(status_code=400, detail="Only Call/Put contract types are supported")
        if request.direction not in {Direction.RISE, Direction.FALL}:
            raise HTTPException(status_code=400, detail="Only Rise/Fall directions are supported")

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

        if not request.symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        if not request.duration_seconds or not request.duration_unit:
            raise HTTPException(status_code=400, detail="Duration is required")
        if int(request.duration_seconds or 0) <= 0:
            raise HTTPException(status_code=400, detail="Duration must be greater than zero")
        
        token = None
        if account.metadata:
            token = account.metadata.get("token")
        if not token:
            token = getattr(user, "deriv_access_token", None)
        if not token:
            raise HTTPException(status_code=400, detail="Missing Deriv access token")

        client = await pool.get_or_create(user.id, token)
        if not client:
            raise HTTPException(status_code=502, detail="Failed to connect to Deriv")

        duration_seconds = int(request.duration_seconds)
        duration_unit = request.duration_unit.lower()
        if duration_unit == "ticks":
            deriv_duration = duration_seconds
            deriv_unit = "t"
        elif duration_unit == "seconds":
            deriv_duration = duration_seconds
            deriv_unit = "s"
        elif duration_unit == "minutes":
            deriv_duration = max(1, int(round(duration_seconds / 60)))
            deriv_unit = "m"
        elif duration_unit == "hours":
            deriv_duration = max(1, int(round(duration_seconds / 3600)))
            deriv_unit = "h"
        else:
            raise HTTPException(status_code=400, detail="Invalid duration unit")

        contract_type = request.contract_type.value
        if request.direction == Direction.RISE:
            contract_type = ContractType.CALL.value
        elif request.direction == Direction.FALL:
            contract_type = ContractType.PUT.value

        proposal_req_id = generate_proposal_id()
        await client.request_proposal(
            symbol=request.symbol,
            contract_type=contract_type,
            amount=stake,
            duration=deriv_duration,
            duration_unit=deriv_unit,
            currency=account.currency,
            req_id=proposal_req_id,
        )

        proposal = await client.wait_for_event(
            "proposal",
            predicate=lambda e: e.get("raw", {}).get("req_id") == proposal_req_id,
            timeout=15,
        )
        if proposal and proposal.get("event") == "error":
            raise HTTPException(status_code=502, detail=proposal.get("message", "Deriv error"))
        if not proposal:
            raise HTTPException(status_code=502, detail="Deriv proposal timeout")

        buy_req_id = generate_proposal_id()
        await client.buy_contract(
            proposal_id=proposal["id"],
            price=proposal["ask_price"],
            req_id=buy_req_id,
        )
        buy = await client.wait_for_event(
            "buy",
            predicate=lambda e: e.get("raw", {}).get("req_id") == buy_req_id,
            timeout=15,
        )
        if buy and buy.get("event") == "error":
            raise HTTPException(status_code=502, detail=buy.get("message", "Deriv error"))
        if not buy:
            raise HTTPException(status_code=502, detail="Deriv buy timeout")
        if not buy.get("contract_id"):
            raise HTTPException(status_code=502, detail="Deriv buy missing contract id")

        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=contract_type,
            direction=request.direction.value,
            stake=stake,
            account=account,
            duration_seconds=duration_seconds,
            proposal_id=proposal["id"],
        )
        trade.transaction_id = str(buy.get("transaction_id") or "")
        await sync_to_async(trade.save)(update_fields=["transaction_id", "updated_at"])

        log_info(
            "Trade executed",
            user_id=user.id,
            trade_id=trade.id,
            stake=str(stake),
            direction=request.direction.value,
            proposal_id=proposal["id"],
            transaction_id=buy.get("transaction_id"),
        )

        await client.subscribe_open_contract(buy["contract_id"])

        timeout_seconds = 120
        if duration_unit in {"seconds", "minutes", "hours"}:
            timeout_seconds = max(30, duration_seconds + 30)
        elif duration_unit == "ticks":
            timeout_seconds = max(30, min(300, duration_seconds * 5))

        contract_update = await client.wait_for_event(
            "proposal_open_contract",
            predicate=lambda e: e.get("contract_id") == buy.get("contract_id") and e.get("is_sold"),
            timeout=timeout_seconds,
        )
        if contract_update and contract_update.get("event") == "error":
            log_error("Deriv contract error", code=contract_update.get("code"))
        elif contract_update:
            payout = contract_update.get("payout")
            profit = contract_update.get("profit")
            payout_value = None
            if payout is not None:
                payout_value = Decimal(str(payout))
            elif profit is not None:
                payout_value = stake + Decimal(str(profit))
            if payout_value is not None:
                await sync_to_async(close_trade)(
                    trade,
                    payout_value,
                    str(buy.get("transaction_id") or ""),
                )
                await sync_to_async(trade.refresh_from_db)()
        
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

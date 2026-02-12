"""
Trade execution and history routes.
"""
from typing import Optional, List
import time
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

def _next_req_id() -> int:
    return int(time.time() * 1000)

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


class TradeType(str, Enum):
    """User-facing trade families."""
    RISE_FALL = "RISE_FALL"
    CALL_PUT = "CALL_PUT"


class RiseFallContract(str, Enum):
    RISE = "RISE"
    FALL = "FALL"


class CallPutContract(str, Enum):
    CALL = "CALL"
    PUT = "PUT"


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
    trade_type: Optional[str] = None
    contract: Optional[str] = None

    class Config:
        from_attributes = True


class ExecuteTradeRequest(BaseModel):
    """Execute trade request."""
    contract_type: Optional[ContractType] = None
    direction: Optional[Direction] = None
    stake: condecimal(max_digits=12, decimal_places=6)
    account_id: int
    duration_seconds: Optional[int] = None
    symbol: Optional[str] = None
    trade_type: Optional[TradeType] = None
    contract: Optional[str] = None


class CreateTradeRequest(BaseModel):
    """Create trade request with flexible payload."""
    trade_type: Optional[TradeType] = None
    contract: Optional[str] = None
    # Legacy fields kept for compatibility with existing frontend payloads.
    contract_type: Optional[ContractType] = None
    direction: Optional[Direction] = None
    stake: condecimal(max_digits=12, decimal_places=6)
    account_id: Optional[int] = None
    duration_seconds: Optional[int] = None
    duration_unit: Optional[str] = None
    symbol: Optional[str] = None

    def resolve_trade_contract(self):
        """
        Resolve user-facing trade choice into execution contract_type + direction.
        Returns:
        - trade_type_label: RISE_FALL | CALL_PUT
        - contract_label: RISE/FALL/CALL/PUT (what user selected)
        - deriv_contract_type: CALL | PUT (for Deriv)
        - direction: RISE | FALL (internal directional axis)
        """
        trade_type = self.trade_type
        contract = (self.contract or "").upper() if self.contract else None

        if trade_type and not contract:
            raise HTTPException(status_code=400, detail="`contract` is required when `trade_type` is set")
        if contract and not trade_type:
            raise HTTPException(status_code=400, detail="`trade_type` is required when `contract` is set")

        if trade_type == TradeType.RISE_FALL:
            if contract not in {RiseFallContract.RISE.value, RiseFallContract.FALL.value}:
                raise HTTPException(status_code=400, detail="For RISE_FALL, contract must be RISE or FALL")
            deriv_contract_type = ContractType.CALL.value if contract == RiseFallContract.RISE.value else ContractType.PUT.value
            direction = contract
            # Reject conflicting legacy fields if provided.
            if self.direction and self.direction.value != direction:
                raise HTTPException(status_code=400, detail="direction conflicts with trade_type/contract")
            if self.contract_type and self.contract_type.value != deriv_contract_type:
                raise HTTPException(status_code=400, detail="contract_type conflicts with trade_type/contract")
            return trade_type.value, contract, deriv_contract_type, direction

        if trade_type == TradeType.CALL_PUT:
            if contract not in {CallPutContract.CALL.value, CallPutContract.PUT.value}:
                raise HTTPException(status_code=400, detail="For CALL_PUT, contract must be CALL or PUT")
            deriv_contract_type = contract
            direction = Direction.RISE.value if deriv_contract_type == ContractType.CALL.value else Direction.FALL.value
            if self.contract_type and self.contract_type.value != deriv_contract_type:
                raise HTTPException(status_code=400, detail="contract_type conflicts with trade_type/contract")
            if self.direction and self.direction.value != direction:
                raise HTTPException(status_code=400, detail="direction conflicts with trade_type/contract")
            return trade_type.value, contract, deriv_contract_type, direction

        # Legacy payload fallback.
        if self.direction:
            direction = self.direction.value
            deriv_contract_type = ContractType.CALL.value if direction == Direction.RISE.value else ContractType.PUT.value
            if self.contract_type and self.contract_type.value != deriv_contract_type:
                raise HTTPException(status_code=400, detail="contract_type/direction mismatch")
            return TradeType.RISE_FALL.value, direction, deriv_contract_type, direction

        if self.contract_type:
            deriv_contract_type = self.contract_type.value
            direction = Direction.RISE.value if deriv_contract_type == ContractType.CALL.value else Direction.FALL.value
            return TradeType.CALL_PUT.value, deriv_contract_type, deriv_contract_type, direction

        raise HTTPException(
            status_code=400,
            detail="Provide either (`trade_type` + `contract`) or legacy `direction` / `contract_type`",
        )


class CloseTradeRequest(BaseModel):
    """Close trade request."""
    payout: condecimal(max_digits=12, decimal_places=6)
    transaction_id: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/execute", response_model=TradeResponse)
async def execute_trade(
    payload: ExecuteTradeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Execute a new trade."""
    try:
        # Log incoming request
        log_info(
            "Trade execution requested",
            user_id=current_user.user_id,
            account_id=payload.account_id,
            symbol=payload.symbol,
            direction=payload.direction,
            stake=str(payload.stake),
        )

        # Validate account ownership
        account = await sync_to_async(Account.objects.get)(
            id=payload.account_id,
            user_id=current_user.user_id
        )

        # Check balance
        if account.balance < payload.stake:
            log_error(
                "Insufficient balance",
                user_id=current_user.user_id,
                account_id=payload.account_id,
                balance=str(account.balance),
                stake=str(payload.stake)
            )
            raise HTTPException(
                status_code=400,
                detail="Insufficient balance for this trade"
            )

        # Execute trade (via Deriv API or trading engine)
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        trade = await _execute_trade_internal(
            user=user,
            account=account,
            symbol=payload.symbol,
            direction=payload.direction.value if payload.direction else "RISE",
            stake=payload.stake,
            duration_seconds=payload.duration_seconds or 300,
        )

        log_info(
            "Trade executed successfully",
            trade_id=trade.id,
            user_id=current_user.user_id,
            account_id=account.id,
        )

        return TradeResponse.from_orm(trade)

    except Account.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Trade execution error", exception=e, user_id=current_user.user_id)
        raise HTTPException(status_code=500, detail="Trade execution failed")


async def _execute_trade_internal(user, account, symbol, direction, stake, duration_seconds):
    """Internal trade execution logic."""
    from django_core.accounts.models import Account
    
    # Create trade record
    trade = await sync_to_async(create_trade)(
        user=user,
        account=account,
        symbol=symbol,
        contract_type="CALL" if direction == "RISE" else "PUT",
        direction=direction,
        stake=stake,
        duration_seconds=duration_seconds,
        status=Trade.STATUS_OPEN,
    )
    
    return trade


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
                trade_type=getattr(trade, 'trade_type', None) or ('RISE_FALL' if trade.direction in ('RISE', 'FALL') else 'CALL_PUT'),
                contract=getattr(trade, 'contract', None) or (trade.direction if trade.direction in ('RISE', 'FALL') else trade.contract_type),
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
                trade_type=getattr(trade, 'trade_type', None) or ('RISE_FALL' if trade.direction in ('RISE', 'FALL') else 'CALL_PUT'),
                contract=getattr(trade, 'contract', None) or (trade.direction if trade.direction in ('RISE', 'FALL') else trade.contract_type),
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
            trade_type=getattr(trade, 'trade_type', None) or ('RISE_FALL' if trade.direction in ('RISE', 'FALL') else 'CALL_PUT'),
            contract=getattr(trade, 'contract', None) or (trade.direction if trade.direction in ('RISE', 'FALL') else trade.contract_type),
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
            contract=getattr(trade, 'contract', None) or (trade.direction if trade.direction in ('RISE', 'FALL') else trade.contract_type),
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


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



class CreateTradeRequest(BaseModel):
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
            direction = Direction.RISE.value if contract == CallPutContract.CALL.value else Direction.FALL.value
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
        trade_type_label, contract_label, deriv_contract_type, direction = request.resolve_trade_contract()

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

        proposal_req_id = _next_req_id()
        await client.request_proposal(
            symbol=request.symbol,
            contract_type=deriv_contract_type,
            amount=stake,
            duration=deriv_duration,
            duration_unit=deriv_unit,
            currency=account.currency,
            req_id=proposal_req_id,
        )

        proposal = await client.wait_for_event(
            "proposal",
            predicate=lambda e: e.get("raw", {}).get("req_id") in {proposal_req_id, None},
            timeout=20,
        )
        if proposal and proposal.get("event") == "error":
            raise HTTPException(status_code=502, detail=proposal.get("message", "Deriv error"))
        if not proposal:
            raise HTTPException(status_code=502, detail="Deriv proposal timeout")

        buy_req_id = _next_req_id()
        await client.buy_contract(
            proposal_id=proposal["id"],
            price=proposal["ask_price"],
            req_id=buy_req_id,
        )
        buy = await client.wait_for_event(
            "buy",
            predicate=lambda e: e.get("raw", {}).get("req_id") in {buy_req_id, None},
            timeout=20,
        )
        if buy and buy.get("event") == "error":
            raise HTTPException(status_code=502, detail=buy.get("message", "Deriv error"))
        if not buy:
            raise HTTPException(status_code=502, detail="Deriv buy timeout")
        if not buy.get("contract_id"):
            raise HTTPException(status_code=502, detail="Deriv buy missing contract id")

        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=deriv_contract_type,
            direction=direction,
            stake=stake,
            account=account,
            duration_seconds=duration_seconds,
            proposal_id=proposal["id"],
            trade_type=trade_type_label,
            contract=contract_label,
        )
        trade.transaction_id = str(buy.get("transaction_id") or "")
        await sync_to_async(trade.save)(update_fields=["transaction_id", "updated_at"])

        log_info(
            "Trade executed",
            user_id=user.id,
            trade_id=trade.id,
            stake=str(stake),
            direction=direction,
            trade_type=trade_type_label,
            contract=contract_label,
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
            # Deriv's `payout` on open_contract can be potential payout.
            # For settled contracts, prefer final settlement fields.
            sell_price = contract_update.get("sell_price")
            profit = contract_update.get("profit")
            status = str(contract_update.get("status") or "").lower()
            payout_value = None

            if sell_price is not None:
                payout_value = Decimal(str(sell_price))
            elif profit is not None:
                payout_value = stake + Decimal(str(profit))
            elif status == "won":
                payout_value = Decimal(str(contract_update.get("payout") or "0"))
            elif status in {"lost", "sold"}:
                payout_value = Decimal("0")

            if payout_value is not None and payout_value < Decimal("0"):
                payout_value = Decimal("0")

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
            trade_type=trade_type_label,
            contract=contract_label,
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
            trade_type=getattr(trade, 'trade_type', None) or ('RISE_FALL' if trade.direction in ('RISE', 'FALL') else 'CALL_PUT'),
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


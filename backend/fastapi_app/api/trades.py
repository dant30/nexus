"""
Trade execution and history routes.
"""
from typing import Optional, List
import time
from decimal import Decimal
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Request
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
from fastapi_app.deriv_ws.serializers import DerivSerializer
from shared.utils.logger import log_info, log_error, log_warning, get_logger

logger = get_logger("trades")
User = get_user_model()

router = APIRouter(tags=["Trades"])

def _next_req_id() -> int:
    return int(time.time() * 1000)


def _normalize_deriv_duration(
    trade_type: Optional[str],
    duration: Optional[int] = None,
    duration_unit: Optional[str] = None,
    duration_seconds: Optional[int] = None,
) -> tuple[int, str]:
    """
    Normalize and validate Deriv duration rules.
    Returns (duration_value, deriv_unit_code).
    """
    trade_type_norm = (trade_type or "RISE_FALL").upper()
    unit_aliases = {
        "tick": "t",
        "ticks": "t",
        "t": "t",
        "second": "s",
        "seconds": "s",
        "s": "s",
        "minute": "m",
        "minutes": "m",
        "m": "m",
        "hour": "h",
        "hours": "h",
        "h": "h",
        "day": "d",
        "days": "d",
        "d": "d",
    }
    allowed_units = {"RISE_FALL": {"t", "s", "m", "h", "d"}, "CALL_PUT": {"m", "h", "d"}}
    min_by_unit = {"t": 1, "s": 15, "m": 1, "h": 1, "d": 1}

    normalized_unit = unit_aliases.get(str(duration_unit).lower()) if duration_unit is not None else None

    if duration is None and duration_seconds is None:
        duration = 1
    if duration is None:
        # Backward-compatible fallback for legacy payloads that only send seconds.
        sec = max(1, int(duration_seconds or 1))
        if trade_type_norm == "CALL_PUT":
            # CALL/PUT does not support ticks/seconds.
            normalized_unit = normalized_unit or "m"
            duration = max(1, int((sec + 59) // 60))
        else:
            # RISE/FALL supports ticks; short durations are interpreted as ticks.
            if normalized_unit is None:
                if sec < 15:
                    normalized_unit = "t"
                    duration = sec
                else:
                    normalized_unit = "s"
                    duration = sec
            else:
                duration = sec
    else:
        duration = max(1, int(duration))
        if normalized_unit is None:
            normalized_unit = "t" if trade_type_norm == "RISE_FALL" else "m"

    if trade_type_norm not in allowed_units:
        trade_type_norm = "RISE_FALL"
    if normalized_unit not in allowed_units[trade_type_norm]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported duration unit '{normalized_unit}' for {trade_type_norm}",
        )
    if duration < min_by_unit[normalized_unit]:
        raise HTTPException(
            status_code=400,
            detail=f"Duration too short for unit '{normalized_unit}'. Minimum is {min_by_unit[normalized_unit]}",
        )

    return duration, normalized_unit


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
    signal_id: Optional[str] = None  # NEW: Add signal_id to response

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
    signal_id: Optional[str] = None  # NEW: Add signal_id to request


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
    signal_id: Optional[str] = None  # NEW: Add signal_id

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
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Manual execution endpoint disabled. Auto bot execution only."""
    log_info(
        "Manual trade execute blocked",
        user_id=current_user.user_id,
        account_id=payload.account_id,
    )
    raise HTTPException(
        status_code=403,
        detail="Manual trade execution is disabled. Use auto bot start/stop via WebSocket.",
    )


async def _execute_trade_internal(
    app,
    user,
    account,
    symbol,
    direction,
    stake,
    duration_seconds,
    contract_type=None,
    contract=None,
    trade_type=None,
    duration=None,
    duration_unit=None,
    signal_id=None,  # NEW: Add signal_id parameter
):
    """
    Internal trade execution:
    1. Request proposal from Deriv
    2. Buy contract if proposal acceptable
    3. Create DB trade record AFTER Deriv confirms buy
    4. Update trade with proposal_id / transaction_id
    5. Broadcast WS trade_status to connected clients
    """
    from django_core.trades.services import create_trade
    
    log_info(
        "Executing trade internally",
        account_id=getattr(account, "id", None),
        symbol=symbol,
        direction=direction,
        stake=str(stake),
        duration_seconds=duration_seconds,
        duration=duration,
        duration_unit=duration_unit,
        signal_id=signal_id,  # NEW
    )

    normalized_duration, normalized_unit = _normalize_deriv_duration(
        trade_type=trade_type,
        duration=duration,
        duration_unit=duration_unit,
        duration_seconds=duration_seconds,
    )

    # If no deriv client configured, create failed trade record
    deriv_client = getattr(app.state, "deriv_client", None)
    if not deriv_client:
        log_error("Deriv client not available - cannot execute trade")
        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
            direction=direction,
            stake=Decimal(stake),
            account=account,
            duration_seconds=duration_seconds,
            proposal_id=None,
            trade_type=trade_type or ("RISE_FALL" if direction in ("RISE", "FALL") else "CALL_PUT"),
            contract=contract or ("CALL" if direction == "RISE" else "PUT"),
            signal_id=signal_id,  # NEW
        )
        trade.status = Trade.STATUS_FAILED
        await sync_to_async(trade.save)()
        return trade

    # Request proposal with a req_id for correlation
    req_id = _next_req_id()
    proposal = None
    
    try:
        log_info(
            "Sending Deriv proposal request",
            symbol=symbol,
            contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
            req_id=req_id,
        )
        proposal_response = await deriv_client.request_proposal(
            symbol=symbol,
            contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
            amount=Decimal(stake),
            duration=normalized_duration,
            duration_unit=normalized_unit,
            currency=getattr(account, "currency", "USD"),
            req_id=req_id,
        )
        proposal = DerivSerializer.deserialize_proposal(proposal_response or {})
    except Exception as exc:
        log_error("Proposal request failed", exception=exc, req_id=req_id)
        proposal = None

    if not proposal or proposal.get("event") != "proposal":
        log_error("No proposal received from Deriv", req_id=req_id)
        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
            direction=direction,
            stake=Decimal(stake),
            account=account,
            duration_seconds=duration_seconds,
            proposal_id=None,
            trade_type=trade_type or ("RISE_FALL" if direction in ("RISE", "FALL") else "CALL_PUT"),
            contract=contract or ("CALL" if direction == "RISE" else "PUT"),
            signal_id=signal_id,  # NEW
        )
        trade.status = Trade.STATUS_FAILED
        await sync_to_async(trade.save)()
        return trade

    # ===== NEW: Only create trade after BUY is confirmed =====
    transaction_id = None
    contract_id = None
    buy_ok = False
    
    try:
        proposal_id = proposal.get("id") or proposal.get("proposal_id")
        ask_price = proposal.get("ask_price") or proposal.get("ask")
        if proposal_id is None or ask_price is None:
            log_error(
                "Invalid proposal payload from Deriv",
                req_id=req_id,
                proposal=proposal,
            )
            buy_ok = False
            raise ValueError("Missing proposal_id or ask_price in proposal response")
        
        log_info(
            "Sending Deriv buy request",
            proposal_id=proposal_id,
            ask_price=ask_price,
            req_id=req_id,
        )
        
        buy_response = await deriv_client.buy_contract(proposal_id, float(ask_price), req_id=req_id)
        buy_evt = DerivSerializer.deserialize_buy(buy_response or {})
        
        if buy_evt and buy_evt.get("event") == "buy":
            contract_id = buy_evt.get("contract_id")
            transaction_id = buy_evt.get("transaction_id") or buy_evt.get("buy_id") or buy_evt.get("id")
            buy_ok = True
            log_info(
                "Buy confirmed by Deriv",
                contract_id=contract_id,
                transaction_id=transaction_id,
                proposal_id=proposal_id,
            )
        else:
            log_error("No buy confirmation received", proposal_id=proposal_id)
            
    except Exception as exc:
        log_error("Buy request failed", exception=exc, proposal_id=proposal.get("id"))

    if not buy_ok or not transaction_id:
        log_error("Trade not executed by Deriv", proposal_id=proposal.get("id"))
        trade = await sync_to_async(create_trade)(
            user=user,
            contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
            direction=direction,
            stake=Decimal(stake),
            account=account,
            duration_seconds=duration_seconds,
            proposal_id=str(proposal.get("id") or proposal.get("proposal_id")),
            trade_type=trade_type or ("RISE_FALL" if direction in ("RISE", "FALL") else "CALL_PUT"),
            contract=contract or ("CALL" if direction == "RISE" else "PUT"),
            signal_id=signal_id,  # NEW
        )
        trade.status = Trade.STATUS_FAILED
        await sync_to_async(trade.save)()
        return trade

    # ===== NOW create trade record (Deriv confirmed buy) =====
    trade = await sync_to_async(create_trade)(
        user=user,
        contract_type=contract_type or ("CALL" if direction == "RISE" else "PUT"),
        direction=direction,
        stake=Decimal(stake),
        account=account,
        duration_seconds=duration_seconds,
        proposal_id=str(proposal.get("id") or proposal.get("proposal_id")),
        trade_type=trade_type or ("RISE_FALL" if direction in ("RISE", "FALL") else "CALL_PUT"),
        contract=contract or ("CALL" if direction == "RISE" else "PUT"),
        signal_id=signal_id,  # NEW
    )
    
    # Set transaction_id
    trade.transaction_id = str(transaction_id)
    await sync_to_async(trade.save)()

    log_info(
        "Trade created AFTER Deriv buy confirmation",
        trade_id=trade.id,
        transaction_id=transaction_id,
        proposal_id=trade.proposal_id,
        signal_id=signal_id,  # NEW
    )

    # Subscribe to open-contract lifecycle and reconcile local trade status.
    # This prevents stale OPEN trades from blocking the bot indefinitely.
    if contract_id:
        try:
            await deriv_client.subscribe_open_contract(int(contract_id))

            # Compute a bounded wait window for contract settlement.
            unit_multipliers = {"t": 1, "s": 1, "m": 60, "h": 3600, "d": 86400}
            expected_seconds = int(normalized_duration) * unit_multipliers.get(normalized_unit, 1)
            settlement_timeout = max(10, min(expected_seconds + 20, 180))

            event = await deriv_client.wait_for_event(
                "proposal_open_contract",
                predicate=lambda e: (
                    isinstance(e, dict)
                    and isinstance(e.get("proposal_open_contract"), dict)
                    and e["proposal_open_contract"].get("contract_id") == int(contract_id)
                ),
                timeout=settlement_timeout,
            )

            if event:
                open_contract = DerivSerializer.deserialize_open_contract(event)
                if open_contract and open_contract.get("is_sold"):
                    payout_value = (
                        open_contract.get("payout")
                        if open_contract.get("payout") is not None
                        else open_contract.get("sell_price")
                    )
                    if payout_value is not None:
                        await sync_to_async(close_trade)(
                            trade,
                            Decimal(str(payout_value)),
                            str(transaction_id),
                        )
                        await sync_to_async(trade.refresh_from_db)()
                        log_info(
                            "Trade settled from open contract update",
                            trade_id=trade.id,
                            contract_id=contract_id,
                            status=trade.status,
                            payout=str(trade.payout) if trade.payout is not None else None,
                            profit=str(trade.profit) if trade.profit is not None else None,
                        )
                    else:
                        trade.status = Trade.STATUS_FAILED
                        await sync_to_async(trade.save)()
                        log_error(
                            "Open contract update missing payout; marked trade failed",
                            trade_id=trade.id,
                            contract_id=contract_id,
                        )
            else:
                trade.status = Trade.STATUS_FAILED
                await sync_to_async(trade.save)()
                log_warning(
                    "No open contract settlement update; marked trade failed",
                    trade_id=trade.id,
                    contract_id=contract_id,
                    timeout=settlement_timeout,
                )
        except Exception as exc:
            trade.status = Trade.STATUS_FAILED
            await sync_to_async(trade.save)()
            log_error(
                "Failed reconciling open contract; marked trade failed",
                trade_id=trade.id,
                contract_id=contract_id,
                exception=exc,
            )

    # Broadcast trade_status to connected WS clients
    try:
        payload = {
            "type": "trade_status",
            "trade_id": trade.id,
            "status": trade.status,
            "proposal_id": trade.proposal_id,
            "transaction_id": trade.transaction_id,
            "stake": str(trade.stake),
            "payout": str(trade.payout) if trade.payout else None,
            "signal_id": signal_id,  # NEW
        }
        
        for connection_id, websocket in list(app.state.ws_connections.items()):
            if str(trade.account_id) in connection_id:
                try:
                    await websocket.send_json(payload)
                except Exception:
                    pass
    except Exception:
        log_error("Failed to broadcast trade_status", trade_id=trade.id)

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
                signal_id=getattr(trade, 'signal_id', None),  # NEW: Include signal_id
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
                signal_id=getattr(trade, 'signal_id', None),  # NEW: Include signal_id
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
            signal_id=getattr(trade, 'signal_id', None),  # NEW: Include signal_id
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
            signal_id=getattr(trade, 'signal_id', None),  # NEW: Include signal_id
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
            "signal_id": getattr(trade, 'signal_id', None),  # NEW: Include signal_id
        }
        
    except Trade.DoesNotExist:
        raise HTTPException(status_code=404, detail="Trade not found")
    except Exception as e:
        log_error("Failed to calculate profit", exception=e)
        raise HTTPException(status_code=500, detail="Calculation failed")

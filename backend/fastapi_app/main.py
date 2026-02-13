"""
FastAPI application entry point for Nexus Trading Bot.
Integrates Django ORM, WebSocket, and trading engine.
"""
import asyncio
import time
from contextlib import asynccontextmanager
from decimal import Decimal
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
from fastapi.responses import JSONResponse
from asgiref.sync import sync_to_async

from shared.database.django import setup_django
from shared.utils.logger import log_info, log_error
from fastapi.exceptions import RequestValidationError

# Initialize Django ORM FIRST
setup_django()

from fastapi_app.config import settings
from fastapi_app.middleware.auth import JWTAuthMiddleware
from fastapi_app.middleware.logging import LoggingMiddleware
from fastapi_app.api import routes
from fastapi_app.oauth import routes as oauth_routes
from fastapi_app.deriv_ws.client import DerivWebSocketClient
from fastapi_app.trading_engine.engine import TradingEngine
from fastapi_app.trading_engine.strategies import (
    MomentumStrategy,
    BreakoutStrategy,
    ScalpingStrategy,
)
from django.contrib.auth import get_user_model
from django_core.accounts.models import Account
from django_core.trades.models import Trade

User = get_user_model()

DERIV_SYMBOLS = set(settings.DERIV_SYMBOLS)
BOT_LOOP_INTERVAL_SECONDS = 3

# Global state for WebSocket & trading engine
class AppState:
    """Global application state."""
    ws_connections = {}
    active_trades = {}
    bot_instances = {}
    ws_subscriptions = {}
    deriv_client = None
    deriv_subscriptions = set()
    deriv_candle_subscriptions = set()
    market_ticks = {}
    market_candles = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events for the FastAPI application.
    """
    # Startup
    log_info("Ã°Å¸Å¡â‚¬ FastAPI startup", service="nexus-trading")
    try:
        setup_django()
        log_info("Ã¢Å“â€¦ Django ORM initialized")
    except Exception as e:
        log_error("Ã¢ÂÅ’ Django setup failed", exception=e)
        raise
    

    if settings.DERIV_API_KEY:
        app.state.deriv_client = DerivWebSocketClient(
            settings.DERIV_APP_ID,
            settings.DERIV_API_KEY,
        )

        async def _deriv_callback(payload):
            if not payload or "symbol" not in payload:
                return
            deriv_symbol = payload["symbol"]
            event = payload.get("event", "tick")

            if event == "candles":
                app.state.market_candles[deriv_symbol] = payload.get("candles", [])[-600:]
            elif event == "ohlc":
                app.state.market_candles.setdefault(deriv_symbol, []).append(payload)
                app.state.market_candles[deriv_symbol] = app.state.market_candles[deriv_symbol][-600:]
            else:
                app.state.market_ticks.setdefault(deriv_symbol, []).append(payload)
                app.state.market_ticks[deriv_symbol] = app.state.market_ticks[deriv_symbol][-600:]

            for connection_id, subscriptions in list(app.state.ws_subscriptions.items()):
                for subscription in list(subscriptions.values()):
                    if subscription.get("symbol") != deriv_symbol:
                        continue
                    websocket = app.state.ws_connections.get(connection_id)
                    if not websocket:
                        continue

                    if event == "candles":
                        await _send_event(websocket, "candles", payload.get("candles", []))
                    elif event == "ohlc":
                        await _send_event(websocket, "candle", payload)
                    else:
                        subscription["ticks"].append(payload)
                        subscription["ticks"] = subscription["ticks"][-600:]
                        await _send_event(websocket, "tick", payload)

        app.state.deriv_client.on_message(_deriv_callback)
        await app.state.deriv_client.connect()
    else:
        log_info("Deriv API key not configured; WS market stream disabled.")

    yield
    
    # Shutdown
    log_info("Ã°Å¸â€ºâ€˜ FastAPI shutdown", service="nexus-trading")
    try:
        # Close all WebSocket connections
        for connection in AppState.ws_connections.values():
            await connection.close()
        log_info("Ã¢Å“â€¦ WebSocket connections closed")
        if app.state.deriv_client:
            await app.state.deriv_client.disconnect()
    except Exception as e:
        log_error("Ã¢ÂÅ’ Shutdown error", exception=e)


# ============================================================================
# Create FastAPI Application
# ============================================================================
app = FastAPI(
    title="Nexus Trading Bot API",
    description="Professional binary trading platform with real-time trading engine",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Store app state
app.state = AppState()


# ============================================================================
# CORS Middleware
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page-Count"],
    max_age=3600,
)

# ============================================================================
# Custom Middleware
# ============================================================================
app.add_middleware(LoggingMiddleware)
app.add_middleware(AuthenticationMiddleware, backend=JWTAuthMiddleware())


# ============================================================================
# Error Handlers
# ============================================================================
class APIException(Exception):
    """Custom API exception."""
    def __init__(self, status_code: int, detail: str, code: str = "ERROR"):
        self.status_code = status_code
        self.detail = detail
        self.code = code


@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handle custom API exceptions."""
    log_error(
        f"API Exception: {exc.detail}",
        code=exc.code,
        path=request.url.path,
        method=request.method,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.detail,
            },
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    log_error(
        "Unhandled exception",
        exception=exc,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log and return detailed validation errors for requests."""
    try:
        body_bytes = await request.body()
        body_text = body_bytes.decode("utf-8", errors="ignore")
    except Exception:
        body_text = "<unable to read body>"

    log_error(
        "Request validation error",
        path=request.url.path,
        method=request.method,
        detail=exc.errors(),
        body=body_text,
    )

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "Request validation failed"},
            "detail": exc.errors(),
            "body": body_text,
        },
    )


# ============================================================================ 
# Health Check & Info Endpoints
# ============================================================================
@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint (supports GET & HEAD)."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "nexus-trading-api",
            "version": "1.0.0",
        }
    )

@app.get("/api/info")
async def api_info():
    """API information endpoint."""
    return {
        "name": "Nexus Trading Bot API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
    }


# ============================================================================
# Include API Routes
# ============================================================================
app.include_router(routes.auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(routes.users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(routes.accounts_router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(routes.trades_router, prefix="/api/v1/trades", tags=["Trades"])
app.include_router(routes.billing_router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(routes.notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(oauth_routes.router, prefix="/api/v1/oauth", tags=["OAuth"])


# ============================================================================
# WebSocket Endpoints
# ============================================================================
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

def _build_candles(ticks, interval: int, count: int = 60):
    if not ticks:
        return []
    buckets = {}
    for tick in ticks:
        epoch = int(tick["time"])
        bucket = (epoch // interval) * interval
        price = float(tick["price"])
        candle = buckets.get(bucket)
        if not candle:
            buckets[bucket] = {
                "time": bucket,
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "volume": 0,
                "symbol": tick["symbol"],
            }
        else:
            candle["high"] = max(candle["high"], price)
            candle["low"] = min(candle["low"], price)
            candle["close"] = price
    return list(sorted(buckets.values(), key=lambda c: c["time"]))[-count:]


async def _signal_from_engine(symbol: str, ticks: list, candles: list, interval: int, account: Account):
    if not ticks and not candles:
        return None
    strategies = [
        MomentumStrategy(symbol=symbol, period=interval),
        BreakoutStrategy(symbol=symbol, period=interval),
        ScalpingStrategy(symbol=symbol, period=interval),
    ]
    engine = TradingEngine(strategies=strategies, account=account)
    result = await engine.analyze(candles=candles, ticks=ticks)
    if not result.get("success"):
        return None
    consensus = result.get("consensus", {})
    direction = consensus.get("direction")
    if direction not in {"RISE", "FALL"}:
        decision = consensus.get("decision", "NEUTRAL")
        if "RISE" in decision:
            direction = "RISE"
        elif "FALL" in decision:
            direction = "FALL"
        else:
            direction = "NEUTRAL"
    minutes = max(1, int(interval / 60))
    return {
        "id": f"sig-{symbol}-{int(time.time())}",
        "symbol": symbol,
        "direction": direction,
        "confidence": float(consensus.get("confidence", 0)),
        "timeframe": f"{minutes}m",
        "source": "Trading Engine",
        "consensus": consensus,
        "strategies": result.get("strategies", []),
    }


def _resolve_direction_from_trade_config(trade_type: str, contract: str):
    if trade_type == "RISE_FALL" and contract in {"RISE", "FALL"}:
        return contract
    if trade_type == "CALL_PUT" and contract in {"CALL", "PUT"}:
        return "RISE" if contract == "CALL" else "FALL"
    return None


def _resolve_trade_execution_from_bot_config(bot_state: dict, decision: str):
    trade_type = (bot_state.get("trade_type") or "RISE_FALL").upper()
    configured_contract = (bot_state.get("contract") or "RISE").upper()
    follow_signal_direction = bool(bot_state.get("follow_signal_direction", True))

    if follow_signal_direction:
        direction = decision
        if trade_type == "CALL_PUT":
            contract = "CALL" if direction == "RISE" else "PUT"
        else:
            contract = direction
    else:
        contract = configured_contract
        direction = _resolve_direction_from_trade_config(trade_type, contract)
        if direction not in {"RISE", "FALL"}:
            return None

    contract_type = "CALL" if direction == "RISE" else "PUT"
    return {
        "direction": direction,
        "trade_type": trade_type,
        "contract": contract,
        "contract_type": contract_type,
    }


def _normalize_bot_duration(trade_type: str, data: dict):
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
    duration_unit = unit_aliases.get(str(data.get("duration_unit", "")).lower()) if data.get("duration_unit") else None
    duration_value = data.get("duration")
    duration_seconds = int(data.get("duration_seconds") or 60)

    if duration_value is None:
        # Backward-compat: legacy payload only sends duration_seconds.
        if trade_type == "CALL_PUT":
            duration_unit = duration_unit or "m"
            duration_value = max(1, int((max(1, duration_seconds) + 59) // 60))
        else:
            if duration_unit is None:
                if duration_seconds < 15:
                    duration_unit = "t"
                    duration_value = max(1, duration_seconds)
                else:
                    duration_unit = "s"
                    duration_value = max(15, duration_seconds)
            else:
                duration_value = max(1, duration_seconds)
    else:
        duration_value = max(1, int(duration_value))
        if duration_unit is None:
            duration_unit = "t" if trade_type == "RISE_FALL" else "m"

    allowed_units = {"RISE_FALL": {"t", "s", "m", "h", "d"}, "CALL_PUT": {"m", "h", "d"}}
    min_by_unit = {"t": 1, "s": 15, "m": 1, "h": 1, "d": 1}
    if trade_type not in allowed_units:
        trade_type = "RISE_FALL"
    if duration_unit not in allowed_units[trade_type]:
        raise ValueError(f"Duration unit '{duration_unit}' is not supported for {trade_type}")
    if duration_value < min_by_unit[duration_unit]:
        raise ValueError(
            f"Duration for unit '{duration_unit}' must be >= {min_by_unit[duration_unit]}"
        )

    # Keep seconds for DB/history consistency.
    if duration_unit == "t":
        normalized_seconds = int(duration_value)
    elif duration_unit == "s":
        normalized_seconds = int(duration_value)
    elif duration_unit == "m":
        normalized_seconds = int(duration_value) * 60
    elif duration_unit == "h":
        normalized_seconds = int(duration_value) * 3600
    else:
        normalized_seconds = int(duration_value) * 86400

    return int(duration_value), duration_unit, normalized_seconds


def _extract_signal_decision(signal: dict, strategy: str):
    strategy_map = {
        "scalping": "ScalpingStrategy",
        "breakout": "BreakoutStrategy",
        "momentum": "MomentumStrategy",
    }
    strategy_key = strategy_map.get((strategy or "").lower())
    entries = signal.get("strategies") or []
    consensus = signal.get("consensus") or {}
    consensus_confidence = float(consensus.get("confidence") or signal.get("confidence") or 0)
    if strategy_key:
        match = next((entry for entry in entries if entry.get("strategy") == strategy_key), None)
        if match and match.get("signal") in {"RISE", "FALL"}:
            strategy_confidence = float(match.get("confidence") or 0)
            # Direction from selected strategy, confidence gate from strongest available evidence.
            return match.get("signal"), max(strategy_confidence, consensus_confidence)

    decision = consensus.get("decision") or signal.get("direction")
    if decision in {"RISE", "FALL"}:
        return decision, float(consensus.get("confidence") or signal.get("confidence") or 0)
    return None, float(consensus.get("confidence") or signal.get("confidence") or 0)


async def _send_bot_status(connection_id: str, data: dict):
    websocket = app.state.ws_connections.get(connection_id)
    if not websocket:
        return
    await _send_event(websocket, "bot_status", data)


async def _stop_bot(connection_id: str, reason: str = "stopped", notify: bool = True):
    state = app.state.bot_instances.pop(connection_id, None)
    if not state:
        return
    task = state.get("task") if isinstance(state, dict) else None
    if task and not task.done():
        task.cancel()
    if notify:
        await _send_bot_status(
            connection_id,
            {
                "state": "stopped",
                "reason": reason,
            },
        )


async def _maybe_execute_bot_trade(
    connection_id: str,
    user_id: int,
    account_id: int,
    account: Account,
    signal: dict,
):
    bot_state = app.state.bot_instances.get(connection_id)
    if not bot_state or not bot_state.get("enabled"):
        return

    if bot_state.get("symbol") != signal.get("symbol"):
        log_info(
            "Bot skipped trade: symbol mismatch",
            connection_id=connection_id,
            bot_symbol=bot_state.get("symbol"),
            signal_symbol=signal.get("symbol"),
        )
        return

    if bot_state.get("session_trades", 0) >= bot_state.get("max_trades_per_session", 1):
        await _stop_bot(connection_id, reason="max_trades_per_session")
        return

    now = time.time()
    if now < float(bot_state.get("cooldown_until", 0)):
        log_info(
            "Bot skipped trade: cooldown active",
            connection_id=connection_id,
            cooldown_until=bot_state.get("cooldown_until"),
            now=now,
        )
        return

    # ===== NEW: Auto-fail trades older than 2 minutes =====
    has_open_trade = await sync_to_async(
        lambda: Trade.objects.filter(
            user_id=user_id,
            account_id=account_id,
            status=Trade.STATUS_OPEN,
        ).first()
    )()
    
    if has_open_trade:
        now_utc = datetime.now(timezone.utc)
        trade_created_at = has_open_trade.created_at
        if trade_created_at.tzinfo is None:
            # Treat legacy naive timestamps as UTC to avoid mixed-aware subtraction.
            trade_created_at = trade_created_at.replace(tzinfo=timezone.utc)
        trade_age_seconds = (now_utc - trade_created_at).total_seconds()
        if trade_age_seconds > 120:  # 2 minutes
            log_info(
                "Auto-failing old open trade",
                connection_id=connection_id,
                trade_id=has_open_trade.id,
                age_seconds=trade_age_seconds,
            )
            has_open_trade.status = Trade.STATUS_FAILED
            await sync_to_async(has_open_trade.save)()
        else:
            log_info(
                "Bot skipped trade: open trade exists",
                connection_id=connection_id,
                account_id=account_id,
                trade_age_seconds=trade_age_seconds,
            )
            return

    decision, confidence = _extract_signal_decision(signal, bot_state.get("strategy"))
    if decision not in {"RISE", "FALL"}:
        log_info(
            "Bot skipped trade: no actionable direction",
            connection_id=connection_id,
            strategy=bot_state.get("strategy"),
            symbol=signal.get("symbol"),
        )
        return
    if confidence < float(bot_state.get("min_confidence", 0.5)):
        log_info(
            "Bot skipped trade: confidence below threshold",
            connection_id=connection_id,
            confidence=confidence,
            min_confidence=bot_state.get("min_confidence", 0.5),
            symbol=signal.get("symbol"),
            decision=decision,
        )
        return

    configured_direction = bot_state.get("direction")
    if configured_direction and configured_direction != decision:
        log_info(
            "Bot skipped trade: signal direction mismatch",
            connection_id=connection_id,
            configured_direction=configured_direction,
            signal_direction=decision,
            symbol=signal.get("symbol"),
        )
        return

    signal_id = signal.get("id") or f"{signal.get('symbol')}-{decision}"
    trade_key = (
        f"{signal_id}:{decision}:{bot_state.get('symbol')}:{bot_state.get('duration')}:"
        f"{bot_state.get('duration_unit')}:"
        f"{bot_state.get('stake')}"
    )
    if bot_state.get("last_trade_key") == trade_key:
        log_info(
            "Bot skipped trade: duplicate signal key",
            connection_id=connection_id,
            trade_key=trade_key,
        )
        return

    from fastapi_app.api.trades import _execute_trade_internal

    execution_config = _resolve_trade_execution_from_bot_config(bot_state, decision)
    if not execution_config:
        log_error(
            "Bot skipped trade: invalid trade_type/contract configuration",
            connection_id=connection_id,
            trade_type=bot_state.get("trade_type"),
            contract=bot_state.get("contract"),
        )
        return

    log_info(
        "Bot executing trade",
        connection_id=connection_id,
        account_id=account_id,
        symbol=bot_state.get("symbol"),
        decision=decision,
        execution_direction=execution_config["direction"],
        execution_trade_type=execution_config["trade_type"],
        execution_contract=execution_config["contract"],
        confidence=confidence,
        stake=bot_state.get("stake"),
        duration_seconds=bot_state.get("duration_seconds"),
        duration=bot_state.get("duration"),
        duration_unit=bot_state.get("duration_unit"),
        contract_type=execution_config["contract_type"],
    )

    user = await sync_to_async(User.objects.get)(id=user_id)
    trade = await _execute_trade_internal(
        app=app,
        user=user,
        account=account,
        symbol=bot_state.get("symbol"),
        direction=execution_config["direction"],
        stake=Decimal(str(bot_state.get("stake"))),
        duration_seconds=int(bot_state.get("duration_seconds", 60)),
        duration=int(bot_state.get("duration", bot_state.get("duration_seconds", 60))),
        duration_unit=str(bot_state.get("duration_unit") or "s"),
        contract_type=execution_config["contract_type"],
        contract=execution_config["contract"],
        trade_type=execution_config["trade_type"],
    )

    # Only update bot state if trade was successfully created
    if trade and trade.status != Trade.STATUS_FAILED:
        bot_state["last_trade_key"] = trade_key
        bot_state["session_trades"] = int(bot_state.get("session_trades", 0)) + 1
        bot_state["cooldown_until"] = now + int(bot_state.get("cooldown_seconds", 0))
        app.state.bot_instances[connection_id] = bot_state

        await _send_bot_status(
            connection_id,
            {
                "state": "running",
                "reason": f"Auto trade executed: {decision}",
                "trade_id": trade.id,
                "session_trades": bot_state.get("session_trades"),
                "cooldown_until": bot_state.get("cooldown_until"),
                "confidence": confidence,
                "symbol": bot_state.get("symbol"),
                "trade_type": execution_config["trade_type"],
                "contract": execution_config["contract"],
            },
        )
    else:
        log_error(
            "Trade execution failed; bot state not updated",
            connection_id=connection_id,
            trade_id=trade.id if trade else None,
            status=trade.status if trade else "NO_TRADE",
        )


async def _bot_loop(websocket: WebSocket, user_id: int, account_id: int, connection_id: str):
    while True:
        if connection_id not in app.state.ws_connections:
            return
        bot_state = app.state.bot_instances.get(connection_id)
        if not bot_state or not bot_state.get("enabled"):
            return
        try:
            await handle_ws_message(websocket, user_id, account_id, {"type": "signals_snapshot"})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log_error("Bot loop iteration failed", exception=exc, connection_id=connection_id)
        await asyncio.sleep(BOT_LOOP_INTERVAL_SECONDS)


def _prune_disconnected_websocket(websocket: WebSocket, reason: str = "disconnected"):
    stale_connection_ids = [
        connection_id
        for connection_id, ws in app.state.ws_connections.items()
        if ws is websocket
    ]
    if not stale_connection_ids:
        return

    for connection_id in stale_connection_ids:
        bot_state = app.state.bot_instances.pop(connection_id, None)
        task = bot_state.get("task") if isinstance(bot_state, dict) else None
        if task and not task.done():
            task.cancel()
        app.state.ws_connections.pop(connection_id, None)
        app.state.ws_subscriptions.pop(connection_id, None)

    log_info(
        "Pruned disconnected WebSocket",
        connection_ids=",".join(stale_connection_ids),
        reason=reason,
        total_connections=len(app.state.ws_connections),
    )


async def _send_event(websocket: WebSocket, event_type: str, data):
    if websocket.client_state != WebSocketState.CONNECTED:
        _prune_disconnected_websocket(websocket, reason="client_state_not_connected")
        return False
    try:
        await websocket.send_json({"type": event_type, "data": data})
        return True
    except Exception as exc:
        message = str(exc)
        if (
            "ConnectionClosed" in exc.__class__.__name__
            or "going away" in message
            or "closed" in message.lower()
        ):
            _prune_disconnected_websocket(websocket, reason="send_on_closed_socket")
            return False
        log_error("Failed to send WS event", exception=exc, event_type=event_type)
        _prune_disconnected_websocket(websocket, reason="send_error")
        return False


@app.websocket("/ws/trading/{user_id}/{account_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, account_id: int):
    """
    WebSocket endpoint for real-time trading updates.
    
    Receives:
    - Market ticks
    - Trade execution confirmations
    - Balance updates
    - Signal notifications
    """
    connection_id = f"{user_id}_{account_id}"
    
    try:
        await websocket.accept()
        app.state.ws_connections[connection_id] = websocket
        
        log_info(
            "WebSocket connected",
            user_id=user_id,
            account_id=account_id,
            total_connections=len(app.state.ws_connections),
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            # Process incoming WebSocket messages (e.g., subscribe to markets)
            await handle_ws_message(websocket, user_id, account_id, data)
            
    except WebSocketDisconnect:
        await _stop_bot(connection_id, reason="websocket_disconnect")
        if connection_id in app.state.ws_connections:
            del app.state.ws_connections[connection_id]
        app.state.ws_subscriptions.pop(connection_id, None)
        log_info(
            "WebSocket disconnected",
            user_id=user_id,
            account_id=account_id,
            total_connections=len(app.state.ws_connections),
        )
    except Exception as e:
        log_error(
            "WebSocket error",
            exception=e,
            user_id=user_id,
            account_id=account_id,
        )
        await _stop_bot(connection_id, reason="websocket_error")
        if connection_id in app.state.ws_connections:
            del app.state.ws_connections[connection_id]
        app.state.ws_subscriptions.pop(connection_id, None)


async def handle_ws_message(websocket: WebSocket, user_id: int, account_id: int, data: dict):
    """Handle incoming WebSocket messages."""
    event_type = data.get("type")

    
    # Raw payload debug to trace missing/incorrect messages from clients
    try:
        log_info("Raw WS payload received", raw=data, event_type=event_type, user_id=user_id, account_id=account_id)
    except Exception:
        pass
    
    log_info(
        "WS message received",
        event_type=event_type,
        user_id=user_id,
        account_id=account_id,
        data_keys=list(data.keys()) if isinstance(data, dict) else "N/A"
    )
    
    if event_type == "subscribe":
        # Subscribe to market data
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        log_info(f"Subscribe to {symbol}", user_id=user_id)
        if not symbol:
            return
        if symbol not in DERIV_SYMBOLS:
            log_error("Unsupported symbol", symbol=symbol)
            return
        deriv_symbol = symbol
        connection_id = f"{user_id}_{account_id}"
        app.state.ws_subscriptions.setdefault(connection_id, {})[symbol] = {
            "interval": interval,
            "ticks": app.state.market_ticks.get(deriv_symbol, [])[-600:],
            "last_candle": 0,
            "symbol": deriv_symbol,
        }
        if app.state.deriv_client:
            if deriv_symbol not in app.state.deriv_subscriptions:
                await app.state.deriv_client.subscribe_ticks(deriv_symbol)
                app.state.deriv_subscriptions.add(deriv_symbol)
            candle_key = f"{deriv_symbol}:{interval}"
            if candle_key not in app.state.deriv_candle_subscriptions:
                await app.state.deriv_client.subscribe_candles(deriv_symbol, interval)
                app.state.deriv_candle_subscriptions.add(candle_key)
        
    elif event_type == "unsubscribe":
        symbol = data.get("symbol")
        log_info(f"Unsubscribe from {symbol}", user_id=user_id)
        connection_id = f"{user_id}_{account_id}"
        bot_state = app.state.bot_instances.get(connection_id)
        if bot_state and bot_state.get("enabled") and bot_state.get("symbol") == symbol:
            log_info(
                "Ignored unsubscribe for active bot symbol",
                connection_id=connection_id,
                symbol=symbol,
            )
            return
        if connection_id in app.state.ws_subscriptions:
            app.state.ws_subscriptions[connection_id].pop(symbol, None)

    elif event_type == "bot_start":
        connection_id = f"{user_id}_{account_id}"
        await _stop_bot(connection_id, reason="restart", notify=False)
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        follow_signal_direction = bool(data.get("follow_signal_direction", True))
        trade_type = (data.get("trade_type") or "RISE_FALL").upper()
        contract = (data.get("contract") or "RISE").upper()
        try:
            duration_value, duration_unit, normalized_duration_seconds = _normalize_bot_duration(trade_type, data)
        except ValueError as exc:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": str(exc),
                },
            )
            return
        direction = None if follow_signal_direction else _resolve_direction_from_trade_config(trade_type, contract)
        bot_state = {
            "enabled": True,
            "symbol": symbol,
            "interval": interval,
            "stake": float(data.get("stake") or 0),
            "duration_seconds": normalized_duration_seconds,
            "duration": duration_value,
            "duration_unit": duration_unit,
            "trade_type": trade_type,
            "contract": contract,
            "direction": direction,
            "follow_signal_direction": follow_signal_direction,
            "strategy": (data.get("strategy") or "scalping").lower(),
            "min_confidence": float(data.get("min_confidence") or 0.5),
            "cooldown_seconds": int(data.get("cooldown_seconds") or 0),
            "max_trades_per_session": int(data.get("max_trades_per_session") or 1),
            "session_trades": 0,
            "cooldown_until": 0,
            "last_trade_key": None,
            "task": None,
        }
        if not symbol or bot_state["stake"] <= 0:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": "Invalid bot settings. Symbol and positive stake are required.",
                },
            )
            return
        if not follow_signal_direction and direction not in {"RISE", "FALL"}:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": "Invalid trade type/contract combination.",
                },
            )
            return
        if symbol not in DERIV_SYMBOLS:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": f"Unsupported symbol: {symbol}",
                },
            )
            return

        app.state.bot_instances[connection_id] = bot_state

        app.state.ws_subscriptions.setdefault(connection_id, {})[symbol] = {
            "interval": interval,
            "ticks": app.state.market_ticks.get(symbol, [])[-600:],
            "last_candle": 0,
            "symbol": symbol,
        }
        if app.state.deriv_client:
            if symbol not in app.state.deriv_subscriptions:
                await app.state.deriv_client.subscribe_ticks(symbol)
                app.state.deriv_subscriptions.add(symbol)
            candle_key = f"{symbol}:{interval}"
            if candle_key not in app.state.deriv_candle_subscriptions:
                await app.state.deriv_client.subscribe_candles(symbol, interval)
                app.state.deriv_candle_subscriptions.add(candle_key)

        task = asyncio.create_task(_bot_loop(websocket, user_id, account_id, connection_id))
        bot_state["task"] = task
        app.state.bot_instances[connection_id] = bot_state
        await _send_bot_status(
            connection_id,
            {
                "state": "running",
                "reason": "Bot started.",
                "symbol": symbol,
                "session_trades": 0,
                "cooldown_until": 0,
                "trade_type": trade_type,
                "contract": contract,
                "follow_signal_direction": follow_signal_direction,
                "duration": duration_value,
                "duration_unit": duration_unit,
            },
        )

    elif event_type == "bot_stop":
        connection_id = f"{user_id}_{account_id}"
        await _stop_bot(connection_id, reason="manual_stop")

    elif event_type == "market_snapshot":
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        connection_id = f"{user_id}_{account_id}"
        subscription = app.state.ws_subscriptions.get(connection_id, {}).get(symbol)
        candles = []
        if subscription:
            candles = app.state.market_candles.get(subscription.get("symbol"), [])
        if not candles:
            ticks = subscription["ticks"] if subscription else app.state.market_ticks.get(symbol, [])
            candles = _build_candles(ticks, interval, count=60)
        await _send_event(websocket, "candles", candles)

    elif event_type == "signals_snapshot":
        connection_id = f"{user_id}_{account_id}"
        subscriptions = app.state.ws_subscriptions.get(connection_id, {})
        signals = []
        bot_state = app.state.bot_instances.get(connection_id)
        try:
            account = await sync_to_async(Account.objects.get)(id=account_id, user_id=user_id)
        except Exception as e:
            log_error("Failed to resolve account for signals", exception=e)
            account = None
        for symbol, sub in subscriptions.items():
            if not account:
                break
            interval = sub.get("interval", 60)
            ticks = sub.get("ticks", [])
            candles = app.state.market_candles.get(sub.get("symbol"), [])
            signal = await _signal_from_engine(symbol, ticks, candles, interval, account)
            if signal:
                signals.append(signal)
                if bot_state and bot_state.get("enabled"):
                    await _maybe_execute_bot_trade(
                        connection_id=connection_id,
                        user_id=user_id,
                        account_id=account_id,
                        account=account,
                        signal=signal,
                    )
        await _send_event(websocket, "signals", signals)


# ============================================================================
# Root Endpoint
# ============================================================================
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Nexus Trading Bot API",
        "docs": "/api/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "fastapi_app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )

"""
FastAPI application entry point for Nexus Trading Bot.
Integrates Django ORM, WebSocket, and trading engine.
Professional-grade with comprehensive error handling, metrics, and persistence.
"""
import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from collections import defaultdict

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from asgiref.sync import sync_to_async
from starlette.websockets import WebSocketState

from shared.database.django import setup_django
from shared.utils.logger import log_info, log_error, log_warning, get_logger

# Initialize Django ORM FIRST
setup_django()

from fastapi_app.config import settings
from fastapi_app.middleware.auth import JWTAuthMiddleware
from fastapi_app.middleware.logging import LoggingMiddleware
from fastapi_app.api import routes
from fastapi_app.oauth import routes as oauth_routes
from fastapi_app.deriv_ws.client import DerivWebSocketClient
from fastapi_app.deriv_ws.serializers import DerivSerializer
from fastapi_app.deriv_ws.connection_pool import pool as deriv_pool
from fastapi_app.trading_engine.engine import TradingEngine
from fastapi_app.trading_engine.risk_manager import RiskManager
from fastapi_app.trading_engine.strategies import (
    MomentumStrategy,
    BreakoutStrategy,
    ScalpingStrategy,
)
from django.contrib.auth import get_user_model
from django_core.accounts.models import Account
from django_core.trades.models import Trade

logger = get_logger("fastapi")
User = get_user_model()

DERIV_SYMBOLS = set(settings.DERIV_SYMBOLS)
BOT_LOOP_INTERVAL_SECONDS = 3

# Strategy cache for performance
_strategy_cache: Dict[str, List] = {}


class AppState:
    """Global application state with metrics and persistence."""
    
    def __init__(self):
        # WebSocket connections
        self.ws_connections: Dict[str, WebSocket] = {}
        self.ws_subscriptions: Dict[str, Dict] = {}
        
        # Bot instances - PERSISTED across disconnects
        self.bot_instances: Dict[str, Dict] = {}
        self.risk_manager: Optional[RiskManager] = None
        
        # Public market-data client and subscriptions (no auth token)
        self.deriv_client: Optional[DerivWebSocketClient] = None
        self.deriv_subscriptions: set = set()
        self.deriv_candle_subscriptions: set = set()
        
        # Market data cache
        self.market_ticks: Dict[str, List] = defaultdict(list)
        self.market_candles: Dict[str, List] = defaultdict(list)
        
        # Performance metrics
        self.metrics = {
            "signals_generated": 0,
            "trades_executed": 0,
            "websocket_messages_sent": 0,
            "websocket_messages_received": 0,
            "errors": 0,
            "total_signal_time_ms": 0,
            "signal_count": 0,
            "start_time": None,
            "active_bot_count": 0,
        }
        
        # Request tracking for rate limiting (simplified)
        self.request_counts: Dict[str, List[float]] = defaultdict(list)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Professional startup and shutdown with proper resource cleanup.
    """
    # Startup
    log_info("🚀 FastAPI startup", service="nexus-trading")
    app.state.metrics["start_time"] = time.time()
    
    try:
        setup_django()
        log_info("✅ Django ORM initialized")
    except Exception as e:
        log_error("❌ Django setup failed", exception=e)
        raise

    try:
        app.state.risk_manager = RiskManager()
        log_info("✅ Risk manager initialized")
    except Exception as e:
        log_error("❌ Risk manager init failed", exception=e)

    # Start per-user Deriv connection pool (trade execution clients).
    try:
        await deriv_pool.start()
        log_info("✅ Deriv connection pool started")
    except Exception as e:
        log_error("❌ Failed to start Deriv connection pool", exception=e)
    
    # Initialize public Deriv market-data client (no owner token auth)
    if settings.DERIV_APP_ID:
        try:
            # Shared public feed client (ticks/candles only).
            app.state.deriv_client = DerivWebSocketClient(
                settings.DERIV_APP_ID,
                "",
                user_id=None  # Shared client
            )

            async def _deriv_callback(payload: Dict[str, Any]):
                """Handle incoming Deriv messages."""
                if not payload:
                    return

                # Normalize payload
                normalized_payload = payload
                if "symbol" not in normalized_payload:
                    if "tick" in payload:
                        normalized_payload = DerivSerializer.deserialize_tick(payload) or {}
                    elif "ohlc" in payload:
                        normalized_payload = DerivSerializer.deserialize_ohlc(payload) or {}
                    elif "candles" in payload:
                        normalized_payload = DerivSerializer.deserialize_candles(payload) or {}

                if not normalized_payload or "symbol" not in normalized_payload:
                    return

                deriv_symbol = normalized_payload["symbol"]
                event = normalized_payload.get("event", "tick")

                # Update market data cache
                if event == "candles":
                    app.state.market_candles[deriv_symbol] = normalized_payload.get("candles", [])[-600:]
                elif event == "ohlc":
                    app.state.market_candles.setdefault(deriv_symbol, []).append(normalized_payload)
                    app.state.market_candles[deriv_symbol] = app.state.market_candles[deriv_symbol][-600:]
                else:
                    app.state.market_ticks.setdefault(deriv_symbol, []).append(normalized_payload)
                    app.state.market_ticks[deriv_symbol] = app.state.market_ticks[deriv_symbol][-600:]

                # Broadcast to subscribed WebSocket clients
                await _broadcast_market_data(app, deriv_symbol, event, normalized_payload)

            app.state.deriv_client.on_message(_deriv_callback)
            
            # Connect with retry
            connected = False
            for attempt in range(3):
                if await app.state.deriv_client.connect():
                    connected = True
                    break
                log_warning(f"Deriv connection attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(2)
            
            if connected:
                log_info("✅ Deriv public market feed connected")
            else:
                log_error("❌ Failed to connect to Deriv after 3 attempts")
                
        except Exception as e:
            log_error("❌ Deriv client initialization failed", exception=e)
    else:
        log_info("Deriv app id not configured; market stream disabled")

    yield
    
    # Shutdown
    log_info("🛑 FastAPI shutdown", service="nexus-trading")
    
    # Save bot states to database before shutdown
    await _persist_all_bot_states(app)
    
    # Close all WebSocket connections
    for connection_id, ws in list(app.state.ws_connections.items()):
        try:
            await ws.close()
        except Exception as e:
            log_error(f"Error closing WebSocket {connection_id}", exception=e)
    
    # Disconnect Deriv client
    if app.state.deriv_client:
        try:
            await app.state.deriv_client.disconnect()
            log_info("✅ Deriv client disconnected")
        except Exception as e:
            log_error("❌ Error disconnecting Deriv client", exception=e)

    # Stop per-user Deriv connection pool
    try:
        await deriv_pool.stop()
        log_info("✅ Deriv connection pool stopped")
    except Exception as e:
        log_error("❌ Error stopping Deriv connection pool", exception=e)
    
    log_info("✅ Shutdown complete")


# ============================================================================
# Helper Functions
# ============================================================================

async def _persist_all_bot_states(app: FastAPI):
    """Save all bot states to database before shutdown."""
    for connection_id, bot_state in app.state.bot_instances.items():
        try:
            if "_" in connection_id:
                user_id, account_id = map(int, connection_id.split("_"))
                await _save_bot_state_to_db(user_id, account_id, bot_state)
        except Exception as e:
            log_error("Failed to persist bot state", exception=e, connection_id=connection_id)


async def _save_bot_state_to_db(user_id: int, account_id: int, bot_state: Dict):
    """Save bot settings to Account model."""
    try:
        account = await sync_to_async(Account.objects.get)(id=account_id, user_id=user_id)
        
        # Update account with bot settings
        account.bot_enabled = bot_state.get("enabled", False)
        account.bot_symbol = bot_state.get("symbol")
        account.bot_strategy = bot_state.get("strategy", "scalping")
        account.bot_stake = Decimal(str(bot_state.get("stake", 0)))
        account.bot_duration = bot_state.get("duration")
        account.bot_duration_unit = bot_state.get("duration_unit")
        account.bot_trade_type = bot_state.get("trade_type", "RISE_FALL")
        account.bot_contract = bot_state.get("contract", "RISE")
        account.bot_min_confidence = bot_state.get("min_confidence", 0.7)
        account.bot_cooldown_seconds = bot_state.get("cooldown_seconds", 30)
        account.bot_max_trades_per_session = bot_state.get("max_trades_per_session", 0)
        account.bot_follow_signal = bot_state.get("follow_signal_direction", True)
        
        await sync_to_async(account.save)()
        log_info("Bot state saved to database", user_id=user_id, account_id=account_id)
    except Exception as e:
        log_error("Failed to save bot state to DB", exception=e)


async def _load_bot_state_from_db(user_id: int, account_id: int) -> Optional[Dict]:
    """Load bot settings from Account model."""
    try:
        account = await sync_to_async(Account.objects.get)(id=account_id, user_id=user_id)
        
        if not account.bot_enabled:
            return None
        
        return {
            "enabled": account.bot_enabled,
            "symbol": account.bot_symbol,
            "strategy": account.bot_strategy or "scalping",
            "stake": float(account.bot_stake) if account.bot_stake else 0,
            "duration": account.bot_duration,
            "duration_unit": account.bot_duration_unit or "m",
            "trade_type": account.bot_trade_type or "RISE_FALL",
            "contract": account.bot_contract or "RISE",
            "min_confidence": account.bot_min_confidence or 0.7,
            "cooldown_seconds": account.bot_cooldown_seconds or 30,
            "max_trades_per_session": account.bot_max_trades_per_session or 0,
            "follow_signal_direction": account.bot_follow_signal if hasattr(account, 'bot_follow_signal') else True,
            "session_trades": 0,
            "cooldown_until": 0,
            "last_trade_key": None,
            "recovery_level": 0,
        }
    except Exception as e:
        log_error("Failed to load bot state from DB", exception=e)
        return None


async def _broadcast_market_data(app: FastAPI, symbol: str, event: str, data: Dict):
    """Broadcast market data to all subscribed clients."""
    for connection_id, subscriptions in list(app.state.ws_subscriptions.items()):
        for subscription in list(subscriptions.values()):
            if subscription.get("symbol") != symbol:
                continue
            
            websocket = app.state.ws_connections.get(connection_id)
            if not websocket:
                continue
            
            if event == "candles":
                await _send_event(websocket, "candles", data.get("candles", []))
            elif event == "ohlc":
                await _send_event(websocket, "candle", data)
            else:
                subscription["ticks"] = subscription.get("ticks", [])[-599:] + [data]
                await _send_event(websocket, "tick", data)


def _build_candles(ticks: List[Dict], interval: int, count: int = 60) -> List[Dict]:
    """Build OHLC candles from tick data."""
    if not ticks:
        return []
    
    buckets = {}
    for tick in ticks:
        epoch = int(tick["time"])
        bucket = (epoch // interval) * interval
        price = float(tick["price"])
        
        if bucket not in buckets:
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
            candle = buckets[bucket]
            candle["high"] = max(candle["high"], price)
            candle["low"] = min(candle["low"], price)
            candle["close"] = price
    
    return list(sorted(buckets.values(), key=lambda c: c["time"]))[-count:]


async def _get_strategies(symbol: str, interval: int) -> List:
    """Get or create cached strategies for performance."""
    cache_key = f"{symbol}:{interval}"
    if cache_key not in _strategy_cache:
        _strategy_cache[cache_key] = [
            MomentumStrategy(symbol=symbol, period=interval),
            BreakoutStrategy(symbol=symbol, period=interval),
            ScalpingStrategy(symbol=symbol, period=interval),
        ]
    return _strategy_cache[cache_key]


async def _signal_from_engine(symbol: str, ticks: list, candles: list, interval: int, account: Account) -> Optional[Dict]:
    """Generate trading signal using cached strategies."""
    if not ticks and not candles:
        return None
    
    start_time = time.time()
    
    try:
        strategies = await _get_strategies(symbol, interval)
        engine = TradingEngine(strategies=strategies, account=account)
        result = await engine.analyze(candles=candles, ticks=ticks)
        
        if not result.get("success"):
            return None
        
        # Update metrics
        signal_time = (time.time() - start_time) * 1000
        app.state.metrics["signals_generated"] += 1
        app.state.metrics["total_signal_time_ms"] += signal_time
        app.state.metrics["signal_count"] += 1
        
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
        signal_id = f"sig-{symbol}-{int(time.time())}-{uuid.uuid4().hex[:4]}"
        
        return {
            "id": signal_id,
            "symbol": symbol,
            "direction": direction,
            "confidence": float(consensus.get("confidence", 0)),
            "timeframe": f"{minutes}m",
            "source": "Trading Engine",
            "consensus": consensus,
            "strategies": result.get("strategies", []),
        }
    except Exception as e:
        log_error("Signal generation failed", exception=e, symbol=symbol)
        return None


def _resolve_direction_from_trade_config(trade_type: str, contract: str) -> Optional[str]:
    """Resolve trade direction from configuration."""
    if trade_type == "RISE_FALL" and contract in {"RISE", "FALL"}:
        return contract
    if trade_type == "CALL_PUT" and contract in {"CALL", "PUT"}:
        return "RISE" if contract == "CALL" else "FALL"
    return None


def _resolve_trade_execution_from_bot_config(bot_state: dict, decision: str) -> Optional[Dict]:
    """Resolve trade execution parameters from bot configuration."""
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


def _normalize_bot_duration(trade_type: str, data: dict) -> tuple:
    """Normalize duration parameters with validation."""
    unit_aliases = {
        "tick": "t", "ticks": "t", "t": "t",
        "second": "s", "seconds": "s", "s": "s",
        "minute": "m", "minutes": "m", "m": "m",
        "hour": "h", "hours": "h", "h": "h",
        "day": "d", "days": "d", "d": "d",
    }
    
    duration_unit = unit_aliases.get(str(data.get("duration_unit", "")).lower()) if data.get("duration_unit") else None
    duration_value = data.get("duration")
    duration_seconds = int(data.get("duration_seconds") or 60)

    if duration_value is None:
        # Legacy support
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

    # Validate allowed units
    allowed_units = {"RISE_FALL": {"t", "s", "m", "h", "d"}, "CALL_PUT": {"m", "h", "d"}}
    min_by_unit = {"t": 1, "s": 15, "m": 1, "h": 1, "d": 1}
    
    if trade_type not in allowed_units:
        trade_type = "RISE_FALL"
    if duration_unit not in allowed_units[trade_type]:
        raise ValueError(f"Duration unit '{duration_unit}' is not supported for {trade_type}")
    if duration_value < min_by_unit[duration_unit]:
        raise ValueError(f"Duration for unit '{duration_unit}' must be >= {min_by_unit[duration_unit]}")

    # Calculate normalized seconds
    if duration_unit == "t":
        normalized_seconds = int(duration_value)
    elif duration_unit == "s":
        normalized_seconds = int(duration_value)
    elif duration_unit == "m":
        normalized_seconds = int(duration_value) * 60
    elif duration_unit == "h":
        normalized_seconds = int(duration_value) * 3600
    else:  # 'd'
        normalized_seconds = int(duration_value) * 86400

    return int(duration_value), duration_unit, normalized_seconds


def _extract_signal_decision(signal: dict, strategy: str) -> tuple:
    """Extract decision and confidence from signal."""
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
            return match.get("signal"), max(strategy_confidence, consensus_confidence)

    decision = consensus.get("decision") or signal.get("direction")
    if decision in {"RISE", "FALL"}:
        return decision, float(consensus.get("confidence") or signal.get("confidence") or 0)
    
    return None, float(consensus.get("confidence") or signal.get("confidence") or 0)


async def _send_bot_status(connection_id: str, data: dict):
    """Send bot status update to client."""
    websocket = app.state.ws_connections.get(connection_id)
    if not websocket:
        return
    payload = dict(data or {})
    if "recovery_level" not in payload:
        bot_state = app.state.bot_instances.get(connection_id, {})
        payload["recovery_level"] = int(bot_state.get("recovery_level", 0) or 0)
    await _send_event(websocket, "bot_status", payload)


async def _stop_bot(connection_id: str, reason: str = "stopped", notify: bool = True):
    """Stop bot and cleanup resources."""
    bot_state = app.state.bot_instances.get(connection_id)
    if not bot_state:
        return
    
    # Cancel bot task
    task = bot_state.get("task")
    if task and not task.done():
        task.cancel()
    
    # Update state
    bot_state["enabled"] = False
    bot_state["task"] = None
    app.state.bot_instances[connection_id] = bot_state
    
    # Save to database
    if "_" in connection_id:
        user_id, account_id = map(int, connection_id.split("_"))
        await _save_bot_state_to_db(user_id, account_id, bot_state)
    
    if notify:
        await _send_bot_status(
            connection_id,
            {
                "state": "stopped",
                "reason": reason,
            }
        )
    
    log_info("Bot stopped", connection_id=connection_id, reason=reason)


async def _maybe_execute_bot_trade(
    connection_id: str,
    user_id: int,
    account_id: int,
    account: Account,
    signal: dict,
) -> None:
    """Execute trade if bot conditions are met."""
    bot_state = app.state.bot_instances.get(connection_id)
    if not bot_state or not bot_state.get("enabled"):
        return

    # Check symbol match
    if bot_state.get("symbol") != signal.get("symbol"):
        log_info(
            "Bot skipped trade: symbol mismatch",
            connection_id=connection_id,
            bot_symbol=bot_state.get("symbol"),
            signal_symbol=signal.get("symbol"),
        )
        return

    # Check session trade limit
    max_trades = bot_state.get("max_trades_per_session", 0)
    if max_trades > 0 and bot_state.get("session_trades", 0) >= max_trades:
        await _stop_bot(connection_id, reason="max_trades_per_session")
        return

    # Check cooldown
    now = time.time()
    cooldown_until = float(bot_state.get("cooldown_until", 0))
    if now < cooldown_until:
        log_info(
            "Bot skipped trade: cooldown active",
            connection_id=connection_id,
            cooldown_until=cooldown_until,
            now=now,
            seconds_remaining=int(cooldown_until - now),
        )
        return

    # Check for and auto-fail old open trades
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

    # Extract decision and confidence
    decision, confidence = _extract_signal_decision(signal, bot_state.get("strategy"))
    
    if decision not in {"RISE", "FALL"}:
        log_info(
            "Bot skipped trade: no actionable direction",
            connection_id=connection_id,
            strategy=bot_state.get("strategy"),
            symbol=signal.get("symbol"),
        )
        return
    
    min_conf = float(bot_state.get("min_confidence", 0.7))
    if confidence < min_conf:
        log_info(
            "Bot skipped trade: confidence below threshold",
            connection_id=connection_id,
            confidence=confidence,
            min_confidence=min_conf,
            symbol=signal.get("symbol"),
            decision=decision,
        )
        return

    # Check configured direction
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

    # Generate unique trade key for idempotency
    signal_id = signal.get("id") or f"{signal.get('symbol')}-{decision}"
    trade_key = (
        f"{signal_id}:{decision}:{bot_state.get('symbol')}:{bot_state.get('duration')}:"
        f"{bot_state.get('duration_unit')}:{bot_state.get('stake')}"
    )
    
    # Check for duplicate
    if bot_state.get("last_trade_key") == trade_key:
        log_info(
            "Bot skipped trade: duplicate signal key",
            connection_id=connection_id,
            trade_key=trade_key,
        )
        return

    # Resolve execution configuration
    execution_config = _resolve_trade_execution_from_bot_config(bot_state, decision)
    if not execution_config:
        log_error(
            "Bot skipped trade: invalid trade_type/contract configuration",
            connection_id=connection_id,
            trade_type=bot_state.get("trade_type"),
            contract=bot_state.get("contract"),
        )
        return

    # Log trade attempt
    requested_stake = Decimal(str(bot_state.get("stake")))
    final_stake = requested_stake
    risk_manager = getattr(app.state, "risk_manager", None)
    if risk_manager is not None:
        try:
            risk_assessment = await risk_manager.assess_trade(account, requested_stake)
            bot_state["recovery_level"] = int(risk_assessment.recovery_level or 0)
            app.state.bot_instances[connection_id] = bot_state
            if not risk_assessment.is_approved:
                log_info(
                    "Bot skipped trade: risk rejected",
                    connection_id=connection_id,
                    risk_level=risk_assessment.risk_level,
                    reason=risk_assessment.reason,
                    issues=risk_assessment.issues,
                    symbol=signal.get("symbol"),
                )
                return

            final_stake = risk_assessment.recovery_stake or requested_stake
        except Exception as exc:
            log_error(
                "Bot skipped trade: risk check failed",
                connection_id=connection_id,
                account_id=account_id,
                exception=exc,
            )
            return

    log_info(
        "🚀 Bot executing trade",
        connection_id=connection_id,
        account_id=account_id,
        symbol=bot_state.get("symbol"),
        decision=decision,
        execution_direction=execution_config["direction"],
        execution_trade_type=execution_config["trade_type"],
        execution_contract=execution_config["contract"],
        confidence=confidence,
        requested_stake=float(requested_stake),
        final_stake=float(final_stake),
        duration_seconds=bot_state.get("duration_seconds"),
        duration=bot_state.get("duration"),
        duration_unit=bot_state.get("duration_unit"),
        contract_type=execution_config["contract_type"],
    )

    # Execute trade
    from fastapi_app.api.trades import _execute_trade_internal

    user = await sync_to_async(User.objects.get)(id=user_id)
    trade = await _execute_trade_internal(
        app=app,
        user=user,
        account=account,
        symbol=bot_state.get("symbol"),
        direction=execution_config["direction"],
        stake=final_stake,
        duration_seconds=int(bot_state.get("duration_seconds", 60)),
        duration=int(bot_state.get("duration", bot_state.get("duration_seconds", 60))),
        duration_unit=str(bot_state.get("duration_unit") or "s"),
        contract_type=execution_config["contract_type"],
        contract=execution_config["contract"],
        trade_type=execution_config["trade_type"],
        signal_id=signal_id,
    )

    # Update bot state on success
    if trade and trade.status != Trade.STATUS_FAILED:
        bot_state["last_trade_key"] = trade_key
        bot_state["session_trades"] = int(bot_state.get("session_trades", 0)) + 1
        bot_state["cooldown_until"] = now + int(bot_state.get("cooldown_seconds", 30))
        bot_state["last_trade_time"] = now
        app.state.bot_instances[connection_id] = bot_state
        
        # Update metrics
        app.state.metrics["trades_executed"] += 1

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
            }
        )
    else:
        log_error(
            "Trade execution failed; bot state not updated",
            connection_id=connection_id,
            trade_id=trade.id if trade else None,
            status=trade.status if trade else "NO_TRADE",
        )


async def _bot_loop(websocket: WebSocket, user_id: int, account_id: int, connection_id: str):
    """Main bot loop - runs every 3 seconds."""
    while True:
        # Check if bot still exists and is enabled
        if connection_id not in app.state.bot_instances:
            return
        
        bot_state = app.state.bot_instances.get(connection_id)
        if not bot_state or not bot_state.get("enabled"):
            return
        
        # Check if websocket still connected
        if connection_id not in app.state.ws_connections:
            log_info("Bot stopping: websocket disconnected", connection_id=connection_id)
            await _stop_bot(connection_id, reason="websocket_disconnected", notify=False)
            return
        
        try:
            # Request signal snapshot
            await handle_ws_message(websocket, user_id, account_id, {"type": "signals_snapshot"})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log_error("Bot loop iteration failed", exception=exc, connection_id=connection_id)
        
        await asyncio.sleep(BOT_LOOP_INTERVAL_SECONDS)


async def _send_event(websocket: WebSocket, event_type: str, data: Any) -> bool:
    """Send WebSocket event with connection state checking."""
    if websocket.client_state != WebSocketState.CONNECTED:
        return False
    
    try:
        await websocket.send_json({"type": event_type, "data": data})
        app.state.metrics["websocket_messages_sent"] += 1
        return True
    except Exception as exc:
        error_msg = str(exc)
        if "ConnectionClosed" in exc.__class__.__name__ or "going away" in error_msg:
            return False
        log_error("Failed to send WS event", exception=exc, event_type=event_type)
        return False


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

# Initialize app state
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
    app.state.metrics["errors"] += 1
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
    """Log and return detailed validation errors."""
    app.state.metrics["errors"] += 1
    
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
            "timestamp": datetime.utcnow().isoformat(),
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


@app.get("/api/metrics")
async def get_metrics():
    """Get system performance metrics."""
    uptime = time.time() - app.state.metrics["start_time"]
    avg_signal_time = (
        app.state.metrics["total_signal_time_ms"] / app.state.metrics["signal_count"]
        if app.state.metrics["signal_count"] > 0 else 0
    )
    
    return {
        "uptime_seconds": round(uptime, 2),
        "active_websockets": len(app.state.ws_connections),
        "active_bots": len([b for b in app.state.bot_instances.values() if b.get("enabled")]),
        "total_signals": app.state.metrics["signals_generated"],
        "total_trades": app.state.metrics["trades_executed"],
        "errors": app.state.metrics["errors"],
        "avg_signal_time_ms": round(avg_signal_time, 2),
        "deriv_connected": app.state.deriv_client is not None and 
                          getattr(app.state.deriv_client, 'status', None) in ["connected", "authorized"],
        "market_symbols": list(DERIV_SYMBOLS),
        "memory_cached_ticks": sum(len(ticks) for ticks in app.state.market_ticks.values()),
        "memory_cached_candles": sum(len(candles) for candles in app.state.market_candles.values()),
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
# WebSocket Endpoint
# ============================================================================
@app.websocket("/ws/trading/{user_id}/{account_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, account_id: int):
    """
    WebSocket endpoint for real-time trading updates.
    
    Features:
    - Market data streaming
    - Bot control (start/stop)
    - Signal generation
    - Trade execution
    - State persistence across reconnects
    """
    connection_id = f"{user_id}_{account_id}"
    
    try:
        # Accept connection
        await websocket.accept()
        app.state.ws_connections[connection_id] = websocket
        app.state.metrics["websocket_messages_received"] += 1
        
        log_info(
            "✅ WebSocket connected",
            user_id=user_id,
            account_id=account_id,
            total_connections=len(app.state.ws_connections),
        )
        
        # Restore bot state if it exists
        if connection_id in app.state.bot_instances:
            bot_state = app.state.bot_instances[connection_id]
            if bot_state.get("enabled"):
                # Restart the bot task
                task = asyncio.create_task(_bot_loop(websocket, user_id, account_id, connection_id))
                bot_state["task"] = task
                app.state.bot_instances[connection_id] = bot_state
                
                # Send status update
                await _send_bot_status(
                    connection_id,
                    {
                        "state": "running",
                        "reason": "Bot restored on reconnect",
                        "symbol": bot_state.get("symbol"),
                        "session_trades": bot_state.get("session_trades", 0),
                        "cooldown_until": bot_state.get("cooldown_until", 0),
                        "trade_type": bot_state.get("trade_type"),
                        "contract": bot_state.get("contract"),
                    }
                )
                
                log_info("Bot state restored on reconnect", connection_id=connection_id)
        
        # Load from database if no in-memory state
        elif connection_id not in app.state.bot_instances:
            bot_state = await _load_bot_state_from_db(user_id, account_id)
            if bot_state:
                app.state.bot_instances[connection_id] = bot_state
                log_info("Bot state loaded from database", connection_id=connection_id)
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            app.state.metrics["websocket_messages_received"] += 1
            await handle_ws_message(websocket, user_id, account_id, data)
            
    except WebSocketDisconnect:
        # Don't delete bot state - keep it for reconnection
        if connection_id in app.state.ws_connections:
            del app.state.ws_connections[connection_id]
        
        # Cancel bot task but keep state
        if connection_id in app.state.bot_instances:
            bot_state = app.state.bot_instances[connection_id]
            if "task" in bot_state and bot_state["task"] and not bot_state["task"].done():
                bot_state["task"].cancel()
            # Keep bot_state, just mark as disconnected in logs
            log_info(
                "Bot state preserved for reconnection",
                connection_id=connection_id,
                enabled=bot_state.get("enabled"),
            )
        
        log_info(
            "WebSocket disconnected - bot state preserved",
            user_id=user_id,
            account_id=account_id,
            total_connections=len(app.state.ws_connections),
        )
        
    except Exception as e:
        app.state.metrics["errors"] += 1
        log_error(
            "WebSocket error",
            exception=e,
            user_id=user_id,
            account_id=account_id,
        )
        
        # Clean up on error but keep bot state
        if connection_id in app.state.ws_connections:
            del app.state.ws_connections[connection_id]
        
        if connection_id in app.state.bot_instances:
            bot_state = app.state.bot_instances[connection_id]
            if "task" in bot_state and bot_state["task"] and not bot_state["task"].done():
                bot_state["task"].cancel()


async def handle_ws_message(websocket: WebSocket, user_id: int, account_id: int, data: dict):
    """Handle incoming WebSocket messages."""
    event_type = data.get("type")
    connection_id = f"{user_id}_{account_id}"
    
    # Log all messages for debugging (can be disabled in production)
    log_info(
        "📨 WS message received",
        event_type=event_type,
        user_id=user_id,
        account_id=account_id,
        data_keys=list(data.keys()) if isinstance(data, dict) else "N/A"
    )
    
    # ===== SUBSCRIBE =====
    if event_type == "subscribe":
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        
        if not symbol or symbol not in DERIV_SYMBOLS:
            log_error("Invalid symbol", symbol=symbol)
            return
        
        deriv_symbol = symbol
        app.state.ws_subscriptions.setdefault(connection_id, {})[symbol] = {
            "interval": interval,
            "ticks": app.state.market_ticks.get(deriv_symbol, [])[-600:],
            "last_candle": 0,
            "symbol": deriv_symbol,
        }
        
        # Subscribe via Deriv client if needed
        if app.state.deriv_client:
            if deriv_symbol not in app.state.deriv_subscriptions:
                await app.state.deriv_client.subscribe_ticks(deriv_symbol)
                app.state.deriv_subscriptions.add(deriv_symbol)
            
            candle_key = f"{deriv_symbol}:{interval}"
            if candle_key not in app.state.deriv_candle_subscriptions:
                await app.state.deriv_client.subscribe_candles(deriv_symbol, interval)
                app.state.deriv_candle_subscriptions.add(candle_key)
        
        log_info(f"Subscribed to {symbol}", user_id=user_id)
    
    # ===== UNSUBSCRIBE =====
    elif event_type == "unsubscribe":
        symbol = data.get("symbol")
        
        # Don't unsubscribe if bot is using this symbol
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
        
        log_info(f"Unsubscribed from {symbol}", user_id=user_id)
    
    # ===== BOT START =====
    elif event_type == "bot_start":
        # Stop any existing bot first
        await _stop_bot(connection_id, reason="restart", notify=False)
        
        # Extract bot parameters
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        follow_signal_direction = bool(data.get("follow_signal_direction", True))
        trade_type = (data.get("trade_type") or "RISE_FALL").upper()
        contract = (data.get("contract") or "RISE").upper()
        
        # Validate duration
        try:
            duration_value, duration_unit, normalized_duration_seconds = _normalize_bot_duration(trade_type, data)
        except ValueError as exc:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": str(exc),
                }
            )
            return
        
        # Resolve direction if not following signals
        direction = None if follow_signal_direction else _resolve_direction_from_trade_config(trade_type, contract)
        
        # Create bot state
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
            "min_confidence": float(data.get("min_confidence") or 0.7),
            "cooldown_seconds": int(data.get("cooldown_seconds") or 30),
            "max_trades_per_session": int(data.get("max_trades_per_session") or 0),
            "session_trades": 0,
            "cooldown_until": 0,
            "last_trade_key": None,
            "last_trade_time": None,
            "recovery_level": 0,
            "task": None,
            "created_at": time.time(),
        }
        
        # Validate required fields
        if not symbol or bot_state["stake"] <= 0:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": "Invalid bot settings. Symbol and positive stake are required.",
                }
            )
            return
        
        if not follow_signal_direction and direction not in {"RISE", "FALL"}:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": "Invalid trade type/contract combination.",
                }
            )
            return
        
        if symbol not in DERIV_SYMBOLS:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": f"Unsupported symbol: {symbol}",
                }
            )
            return

        # Store bot state
        app.state.bot_instances[connection_id] = bot_state

        # Ensure subscription exists
        app.state.ws_subscriptions.setdefault(connection_id, {})[symbol] = {
            "interval": interval,
            "ticks": app.state.market_ticks.get(symbol, [])[-600:],
            "last_candle": 0,
            "symbol": symbol,
        }
        
        # Subscribe via Deriv client
        if app.state.deriv_client:
            if symbol not in app.state.deriv_subscriptions:
                await app.state.deriv_client.subscribe_ticks(symbol)
                app.state.deriv_subscriptions.add(symbol)
            
            candle_key = f"{symbol}:{interval}"
            if candle_key not in app.state.deriv_candle_subscriptions:
                await app.state.deriv_client.subscribe_candles(symbol, interval)
                app.state.deriv_candle_subscriptions.add(candle_key)

        # Start bot task
        task = asyncio.create_task(_bot_loop(websocket, user_id, account_id, connection_id))
        bot_state["task"] = task
        app.state.bot_instances[connection_id] = bot_state
        
        # Save to database
        await _save_bot_state_to_db(user_id, account_id, bot_state)
        
        # Update metrics
        app.state.metrics["active_bot_count"] += 1
        
        # Send status
        await _send_bot_status(
            connection_id,
            {
                "state": "running",
                "reason": "Bot started successfully",
                "symbol": symbol,
                "session_trades": 0,
                "cooldown_until": 0,
                "trade_type": trade_type,
                "contract": contract,
                "follow_signal_direction": follow_signal_direction,
                "duration": duration_value,
                "duration_unit": duration_unit,
                "min_confidence": bot_state["min_confidence"],
            }
        )
        
        log_info("🤖 Bot started", connection_id=connection_id, symbol=symbol)
    
    # ===== BOT STOP =====
    elif event_type == "bot_stop":
        await _stop_bot(connection_id, reason="manual_stop")
        log_info("Bot stopped by user", connection_id=connection_id)
    
    # ===== MARKET SNAPSHOT =====
    elif event_type == "market_snapshot":
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        
        subscription = app.state.ws_subscriptions.get(connection_id, {}).get(symbol)
        candles = []
        
        if subscription:
            candles = app.state.market_candles.get(subscription.get("symbol"), [])
        
        if not candles:
            ticks = subscription["ticks"] if subscription else app.state.market_ticks.get(symbol, [])
            candles = _build_candles(ticks, interval, count=60)
        
        await _send_event(websocket, "candles", candles)
    
    # ===== SIGNALS SNAPSHOT =====
    elif event_type == "signals_snapshot":
        subscriptions = app.state.ws_subscriptions.get(connection_id, {})
        signals = []
        bot_state = app.state.bot_instances.get(connection_id)
        
        # Get account
        try:
            account = await sync_to_async(Account.objects.get)(id=account_id, user_id=user_id)
        except Exception as e:
            log_error("Failed to resolve account for signals", exception=e)
            account = None
        
        # Generate signals for each subscribed symbol
        for symbol, sub in subscriptions.items():
            if not account:
                break
            
            interval = sub.get("interval", 60)
            ticks = sub.get("ticks", [])
            candles = app.state.market_candles.get(sub.get("symbol"), [])
            
            signal = await _signal_from_engine(symbol, ticks, candles, interval, account)
            if signal:
                signals.append(signal)
                
                # Execute bot trade if enabled
                if bot_state and bot_state.get("enabled"):
                    await _maybe_execute_bot_trade(
                        connection_id=connection_id,
                        user_id=user_id,
                        account_id=account_id,
                        account=account,
                        signal=signal,
                    )
        
        await _send_event(websocket, "signals", signals)
    
    # ===== GET BOT STATUS =====
    elif event_type == "get_bot_status":
        bot_state = app.state.bot_instances.get(connection_id)
        if bot_state:
            await _send_bot_status(
                connection_id,
                {
                    "state": "running" if bot_state.get("enabled") else "stopped",
                    "reason": "Bot status",
                    "symbol": bot_state.get("symbol"),
                    "session_trades": bot_state.get("session_trades", 0),
                    "cooldown_until": bot_state.get("cooldown_until", 0),
                    "trade_type": bot_state.get("trade_type"),
                    "contract": bot_state.get("contract"),
                    "follow_signal_direction": bot_state.get("follow_signal_direction", True),
                    "min_confidence": bot_state.get("min_confidence", 0.7),
                    "stake": bot_state.get("stake"),
                }
            )
        else:
            await _send_bot_status(
                connection_id,
                {
                    "state": "stopped",
                    "reason": "No bot configured",
                }
            )
    
    # ===== PING =====
    elif event_type == "ping":
        await _send_event(websocket, "pong", {"timestamp": time.time()})


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
        "metrics": "/api/metrics",
        "version": "1.0.0",
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

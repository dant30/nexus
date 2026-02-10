"""
FastAPI application entry point for Nexus Trading Bot.
Integrates Django ORM, WebSocket, and trading engine.
"""
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from shared.database.django import setup_django
from shared.utils.logger import log_info, log_error, get_logger

# Initialize Django ORM FIRST
setup_django()

from fastapi_app.config import settings
from fastapi_app.middleware.auth import JWTAuthMiddleware
from fastapi_app.middleware.logging import LoggingMiddleware
from fastapi_app.api import routes
from fastapi_app.oauth import routes as oauth_routes
from fastapi_app.deriv_ws.client import DerivWebSocketClient

logger = get_logger("fastapi")

DERIV_SYMBOL_MAP = {
    "EURUSD": "frxEURUSD",
    "GBPUSD": "frxGBPUSD",
    "USDJPY": "frxUSDJPY",
    "AUDUSD": "frxAUDUSD",
}

# Global state for WebSocket & trading engine
class AppState:
    """Global application state."""
    ws_connections = {}
    active_trades = {}
    bot_instances = {}
    ws_subscriptions = {}
    deriv_client = None
    deriv_subscriptions = set()
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

            if event == "ohlc":
                app.state.market_candles.setdefault(deriv_symbol, []).append(payload)
                app.state.market_candles[deriv_symbol] = app.state.market_candles[deriv_symbol][-600:]
            else:
                app.state.market_ticks.setdefault(deriv_symbol, []).append(payload)
                app.state.market_ticks[deriv_symbol] = app.state.market_ticks[deriv_symbol][-600:]

            for connection_id, subscriptions in app.state.ws_subscriptions.items():
                for subscription in subscriptions.values():
                    if subscription.get("deriv_symbol") != deriv_symbol:
                        continue
                    websocket = app.state.ws_connections.get(connection_id)
                    if not websocket:
                        continue

                    ui_symbol = subscription.get("ui_symbol", deriv_symbol)
                    outgoing = {**payload, "symbol": ui_symbol}

                    if event == "ohlc":
                        await _send_event(websocket, "candle", outgoing)
                    else:
                        subscription["ticks"].append(outgoing)
                        subscription["ticks"] = subscription["ticks"][-600:]
                        await _send_event(websocket, "tick", outgoing)

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


def _signal_from_ticks(symbol: str, ticks: list, interval: int):
    if len(ticks) < 5:
        return None
    first = float(ticks[0]["price"])
    last = float(ticks[-1]["price"])
    direction = "RISE" if last >= first else "FALL"
    move = abs(last - first)
    confidence = min(0.95, max(0.55, move * 800))
    minutes = max(1, int(interval / 60))
    return {
        "id": f"sig-{symbol}-{ticks[-1]['time']}",
        "symbol": symbol,
        "direction": direction,
        "confidence": round(confidence, 2),
        "timeframe": f"{minutes}m",
        "source": "WS Engine",
    }


async def _send_event(websocket: WebSocket, event_type: str, data):
    await websocket.send_json({"type": event_type, "data": data})


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
        if connection_id in app.state.ws_connections:
            del app.state.ws_connections[connection_id]
        app.state.ws_subscriptions.pop(connection_id, None)


async def handle_ws_message(websocket: WebSocket, user_id: int, account_id: int, data: dict):
    """Handle incoming WebSocket messages."""
    event_type = data.get("type")
    
    if event_type == "subscribe":
        # Subscribe to market data
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        log_info(f"Subscribe to {symbol}", user_id=user_id)
        if not symbol:
            return
        deriv_symbol = DERIV_SYMBOL_MAP.get(symbol, symbol)
        connection_id = f"{user_id}_{account_id}"
        app.state.ws_subscriptions.setdefault(connection_id, {})[symbol] = {
            "interval": interval,
            "ticks": app.state.market_ticks.get(deriv_symbol, [])[-600:],
            "last_candle": 0,
            "ui_symbol": symbol,
            "deriv_symbol": deriv_symbol,
        }
        if app.state.deriv_client:
            if deriv_symbol not in app.state.deriv_subscriptions:
                await app.state.deriv_client.subscribe_ticks(deriv_symbol)
                app.state.deriv_subscriptions.add(deriv_symbol)
            await app.state.deriv_client.subscribe_candles(deriv_symbol, interval)
        
    elif event_type == "unsubscribe":
        symbol = data.get("symbol")
        log_info(f"Unsubscribe from {symbol}", user_id=user_id)
        connection_id = f"{user_id}_{account_id}"
        if connection_id in app.state.ws_subscriptions:
            app.state.ws_subscriptions[connection_id].pop(symbol, None)

    elif event_type == "market_snapshot":
        symbol = data.get("symbol")
        interval = int(data.get("interval") or 60)
        connection_id = f"{user_id}_{account_id}"
        subscription = app.state.ws_subscriptions.get(connection_id, {}).get(symbol)
        candles = []
        if subscription:
            candles = app.state.market_candles.get(subscription.get("deriv_symbol"), [])
        if not candles:
            ticks = subscription["ticks"] if subscription else app.state.market_ticks.get(symbol, [])
            candles = _build_candles(ticks, interval, count=60)
        normalized = []
        for candle in candles:
            normalized.append({**candle, "symbol": symbol})
        await _send_event(websocket, "candles", normalized)

    elif event_type == "signals_snapshot":
        connection_id = f"{user_id}_{account_id}"
        subscriptions = app.state.ws_subscriptions.get(connection_id, {})
        signals = []
        for symbol, sub in subscriptions.items():
            signal = _signal_from_ticks(symbol, sub.get("ticks", []), sub.get("interval", 60))
            if signal:
                signals.append(signal)
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

"""
FastAPI application entry point for Nexus Trading Bot.
Integrates Django ORM, WebSocket, and trading engine.
"""
import logging
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

logger = get_logger("fastapi")


# Global state for WebSocket & trading engine
class AppState:
    """Global application state."""
    ws_connections = {}
    active_trades = {}
    bot_instances = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events for the FastAPI application.
    """
    # Startup
    log_info("ðŸš€ FastAPI startup", service="nexus-trading")
    try:
        setup_django()
        log_info("âœ… Django ORM initialized")
    except Exception as e:
        log_error("âŒ Django setup failed", exception=e)
        raise
    
    yield
    
    # Shutdown
    log_info("ðŸ›‘ FastAPI shutdown", service="nexus-trading")
    try:
        # Close all WebSocket connections
        for connection in AppState.ws_connections.values():
            await connection.close()
        log_info("âœ… WebSocket connections closed")
    except Exception as e:
        log_error("âŒ Shutdown error", exception=e)


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
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "nexus-trading-api",
        "version": "1.0.0",
    }


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


# ============================================================================
# WebSocket Endpoints
# ============================================================================
from fastapi import WebSocket, WebSocketDisconnect

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


async def handle_ws_message(websocket: WebSocket, user_id: int, account_id: int, data: dict):
    """Handle incoming WebSocket messages."""
    event_type = data.get("type")
    
    if event_type == "subscribe":
        # Subscribe to market data
        symbol = data.get("symbol")
        log_info(f"Subscribe to {symbol}", user_id=user_id)
        
    elif event_type == "unsubscribe":
        symbol = data.get("symbol")
        log_info(f"Unsubscribe from {symbol}", user_id=user_id)


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

"""
FastAPI application module for Nexus Trading Bot.

Includes:
- REST API endpoints (auth, users, accounts, trades, billing, notifications)
- WebSocket real-time trading updates
- Deriv OAuth2 integration
- Trading engine (strategies, commission, risk management)
- Middleware (authentication, logging, error handling)
"""

from .main import app, AppState
from .config import settings
from . import api
from . import deriv_ws
from . import trading_engine
from . import oauth

__all__ = [
    "app",
    "AppState",
    "settings",
    "api",
    "deriv_ws",
    "trading_engine",
    "oauth",
]

"""
FastAPI route aggregator.
Combines all API routers into a single module for easy inclusion.
"""
from fastapi import APIRouter

from . import auth, users, accounts, trades, notifications, billing, admin

# Define module-level routers for individual imports
auth_router = auth.router
users_router = users.router
accounts_router = accounts.router
trades_router = trades.router
billing_router = billing.router
notifications_router = notifications.router
admin_router = admin.router

# Create main router
api_router = APIRouter()

# Include sub-routers (without prefix, they handle their own)
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(users.router, prefix="/users")
api_router.include_router(accounts.router, prefix="/accounts")
api_router.include_router(trades.router, prefix="/trades")
api_router.include_router(billing.router, prefix="/billing")
api_router.include_router(notifications.router, prefix="/notifications")
api_router.include_router(admin.router, prefix="/admin")

# Export for main.py
__all__ = [
    "api_router",
    "auth_router",
    "users_router",
    "accounts_router",
    "trades_router",
    "billing_router",
    "notifications_router",
    "admin_router",
]

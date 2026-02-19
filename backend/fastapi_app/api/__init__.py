"""
FastAPI routes module.
Exports all route routers.
"""

from fastapi import APIRouter

# These will be set by the individual route modules
auth_router = APIRouter(tags=["Authentication"])
users_router = APIRouter(tags=["Users"])
accounts_router = APIRouter(tags=["Accounts"])
trades_router = APIRouter(tags=["Trades"])
billing_router = APIRouter(tags=["Billing"])
notifications_router = APIRouter(tags=["Notifications"])
admin_router = APIRouter(tags=["Admin"])

__all__ = [
    "auth_router",
    "users_router",
    "accounts_router",
    "trades_router",
    "billing_router",
    "notifications_router",
    "admin_router",
]

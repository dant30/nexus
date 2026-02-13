"""
Deriv WebSocket integration for Nexus Trading.
Professional WebSocket client with connection pooling and event handling.
"""

from .client import DerivWebSocketClient
from .connection_pool import pool
from .events import (
    DerivEventType,
    WebSocketStatus,
    Subscription,
    SubscriptionManager,
    subscription_manager,
)
from .handlers import handler, DerivEventHandler
from .serializers import (
    DerivSerializer,
    TickData,
    CandleData,
    ContractProposal,
    ContractStatus,
    BalanceUpdate,
)

__all__ = [
    # Client
    "DerivWebSocketClient",
    "pool",
    
    # Events
    "DerivEventType",
    "WebSocketStatus",
    "Subscription",
    "SubscriptionManager",
    "subscription_manager",
    
    # Handlers
    "DerivEventHandler",
    "handler",
    
    # Serializers
    "DerivSerializer",
    "TickData",
    "CandleData",
    "ContractProposal",
    "ContractStatus",
    "BalanceUpdate",
]
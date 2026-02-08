"""
Deriv WebSocket integration module.
Handles real-time connection to Deriv API.
"""

from .client import DerivWebSocketClient
from .connection_pool import ConnectionPool, pool
from .events import DerivEventType, WebSocketStatus
from .handlers import DerivEventHandler
from .serializers import DerivSerializer

__all__ = [
    "DerivWebSocketClient",
    "ConnectionPool",
    "pool",
    "DerivEventType",
    "WebSocketStatus",
    "DerivEventHandler",
    "DerivSerializer",
]

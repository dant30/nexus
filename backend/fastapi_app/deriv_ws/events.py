"""
Deriv WebSocket events and subscriptions.
"""
from enum import Enum
from typing import Dict, List, Literal, Tuple


# ============================================================================
# Canonical event names (single source of truth)
# ============================================================================

DERIV_EVENT_NAMES: Tuple[str, ...] = (
    # Connection / control
    "authorize",
    "ticks",
    "candles",
    "forget",

    # Market data
    "tick",
    "ohlc",
    "balance",

    # Trading
    "buy",
    "sell",
    "proposal",
    "proposal_open_contract",

    # Errors / lifecycle
    "error",
    "logout",
)

EventName = Literal[
    "authorize",
    "ticks",
    "candles",
    "forget",
    "tick",
    "ohlc",
    "balance",
    "buy",
    "sell",
    "proposal",
    "proposal_open_contract",
    "error",
    "logout",
]


# ============================================================================
# WebSocket connection status
# ============================================================================

class WebSocketStatus(str, Enum):
    """WebSocket connection states."""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    AUTHORIZED = "authorized"
    RECONNECTING = "reconnecting"
    DISCONNECTED = "disconnected"
    ERROR = "error"


# ============================================================================
# Deriv WebSocket event enum (runtime usage)
# ============================================================================

class DerivEventType(str, Enum):
    """Deriv WebSocket event types."""

    # Connection events
    AUTHORIZE = "authorize"
    SUBSCRIBE_TICK = "ticks"
    SUBSCRIBE_CANDLE = "candles"
    UNSUBSCRIBE = "forget"

    # Market events
    TICK = "tick"
    CANDLE = "ohlc"
    BALANCE = "balance"

    # Trade events
    BUY = "buy"
    SELL = "sell"
    PROPOSAL = "proposal"
    PROPOSAL_OPEN_CONTRACT = "proposal_open_contract"

    # Error / lifecycle
    ERROR = "error"
    LOGOUT = "logout"


# ============================================================================
# Subscription models
# ============================================================================

class Subscription:
    """Represents a subscription to Deriv data."""

    def __init__(
        self,
        subscription_id: int,
        event_type: EventName,
        symbol: str,
    ):
        """
        Initialize subscription.

        Args:
            subscription_id: Deriv subscription ID
            event_type: Event name (strictly typed)
            symbol: Symbol being subscribed to
        """
        self.subscription_id = subscription_id
        self.event_type = event_type
        self.symbol = symbol
        self.active = True

    def to_dict(self) -> Dict:
        """Convert subscription to dictionary."""
        return {
            "subscription_id": self.subscription_id,
            "event_type": self.event_type,
            "symbol": self.symbol,
            "active": self.active,
        }


class SubscriptionManager:
    """Manage multiple Deriv subscriptions."""

    def __init__(self):
        self.subscriptions: Dict[int, Subscription] = {}

    def add_subscription(
        self,
        sub_id: int,
        event_type: EventName,
        symbol: str,
    ) -> Subscription:
        """Add a subscription."""
        sub = Subscription(sub_id, event_type, symbol)
        self.subscriptions[sub_id] = sub
        return sub

    def remove_subscription(self, sub_id: int) -> bool:
        """Remove a subscription."""
        return self.subscriptions.pop(sub_id, None) is not None

    def get_subscription(self, sub_id: int) -> Subscription | None:
        """Get a subscription by ID."""
        return self.subscriptions.get(sub_id)

    def list_subscriptions(self) -> List[Subscription]:
        """List all active subscriptions."""
        return list(self.subscriptions.values())

    def clear_subscriptions(self) -> None:
        """Clear all subscriptions."""
        self.subscriptions.clear()


# ============================================================================
# Sanity check: ensure DERIV_EVENT_NAMES matches DerivEventType
# ============================================================================

assert set(DERIV_EVENT_NAMES) == {e.value for e in DerivEventType}, (
    "DERIV_EVENT_NAMES does not match DerivEventType! "
    "Fix the canonical list or the Enum."
)

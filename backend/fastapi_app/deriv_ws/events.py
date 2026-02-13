"""
Deriv WebSocket events and subscriptions - Single source of truth.
Professional implementation with strict typing and validation.
"""
from enum import Enum
from typing import Dict, List, Literal, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime


# ============================================================================
# Canonical event names - Single source of truth
# ============================================================================

DERIV_EVENT_NAMES = {
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
}  # type: Set[str]

EventName = Literal[
    "authorize", "ticks", "candles", "forget",
    "tick", "ohlc", "balance",
    "buy", "sell", "proposal", "proposal_open_contract",
    "error", "logout",
]


class DerivEventType(str, Enum):
    """Deriv WebSocket event types - Runtime enum matching canonical names."""
    
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


class WebSocketStatus(str, Enum):
    """WebSocket connection states with clear lifecycle."""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    AUTHORIZED = "authorized"
    RECONNECTING = "reconnecting"
    DISCONNECTED = "disconnected"
    ERROR = "error"


# ============================================================================
# Professional Subscription Management
# ============================================================================

@dataclass
class Subscription:
    """Represents an active subscription to Deriv data."""
    
    subscription_id: int
    event_type: EventName
    symbol: str
    user_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    active: bool = True
    
    def to_dict(self) -> Dict:
        """Convert subscription to dictionary for serialization."""
        return {
            "subscription_id": self.subscription_id,
            "event_type": self.event_type,
            "symbol": self.symbol,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "active": self.active,
        }


class SubscriptionManager:
    """
    Thread-safe subscription manager for Deriv WebSocket connections.
    
    Features:
    - Track active subscriptions per user
    - Prevent duplicate subscriptions
    - Automatic cleanup on disconnect
    - Subscription metrics
    """
    
    def __init__(self):
        self._subscriptions: Dict[int, Subscription] = {}  # sub_id -> Subscription
        self._user_subscriptions: Dict[int, Set[int]] = {}  # user_id -> Set[sub_id]
        self._symbol_subscriptions: Dict[str, Set[int]] = {}  # symbol -> Set[sub_id]
    
    def add(self, sub_id: int, event_type: EventName, symbol: str, user_id: int) -> Subscription:
        """Add a subscription with full tracking."""
        # Remove existing subscription for same user/symbol/event
        self.remove_by_user_symbol_event(user_id, symbol, event_type)
        
        # Create new subscription
        sub = Subscription(sub_id, event_type, symbol, user_id)
        self._subscriptions[sub_id] = sub
        
        # Track by user
        if user_id not in self._user_subscriptions:
            self._user_subscriptions[user_id] = set()
        self._user_subscriptions[user_id].add(sub_id)
        
        # Track by symbol
        if symbol not in self._symbol_subscriptions:
            self._symbol_subscriptions[symbol] = set()
        self._symbol_subscriptions[symbol].add(sub_id)
        
        return sub
    
    def remove(self, sub_id: int) -> Optional[Subscription]:
        """Remove a subscription and all its tracking."""
        sub = self._subscriptions.pop(sub_id, None)
        if sub:
            # Remove from user tracking
            if sub.user_id in self._user_subscriptions:
                self._user_subscriptions[sub.user_id].discard(sub_id)
                if not self._user_subscriptions[sub.user_id]:
                    del self._user_subscriptions[sub.user_id]
            
            # Remove from symbol tracking
            if sub.symbol in self._symbol_subscriptions:
                self._symbol_subscriptions[sub.symbol].discard(sub_id)
                if not self._symbol_subscriptions[sub.symbol]:
                    del self._symbol_subscriptions[sub.symbol]
        
        return sub
    
    def get(self, sub_id: int) -> Optional[Subscription]:
        """Get subscription by ID."""
        return self._subscriptions.get(sub_id)
    
    def get_by_user(self, user_id: int) -> List[Subscription]:
        """Get all subscriptions for a user."""
        sub_ids = self._user_subscriptions.get(user_id, set())
        return [self._subscriptions[sub_id] for sub_id in sub_ids if sub_id in self._subscriptions]
    
    def get_by_symbol(self, symbol: str) -> List[Subscription]:
        """Get all subscriptions for a symbol."""
        sub_ids = self._symbol_subscriptions.get(symbol, set())
        return [self._subscriptions[sub_id] for sub_id in sub_ids if sub_id in self._subscriptions]
    
    def remove_by_user(self, user_id: int) -> List[int]:
        """Remove all subscriptions for a user. Returns removed subscription IDs."""
        sub_ids = self._user_subscriptions.pop(user_id, set())
        removed = []
        for sub_id in sub_ids:
            if sub_id in self._subscriptions:
                sub = self._subscriptions.pop(sub_id)
                # Clean up symbol tracking
                if sub.symbol in self._symbol_subscriptions:
                    self._symbol_subscriptions[sub.symbol].discard(sub_id)
                removed.append(sub_id)
        return removed
    
    def remove_by_user_symbol_event(self, user_id: int, symbol: str, event_type: EventName) -> Optional[int]:
        """Remove specific subscription. Returns subscription ID if removed."""
        subscriptions = self.get_by_user(user_id)
        for sub in subscriptions:
            if sub.symbol == symbol and sub.event_type == event_type:
                self.remove(sub.subscription_id)
                return sub.subscription_id
        return None
    
    def clear(self) -> None:
        """Clear all subscriptions."""
        self._subscriptions.clear()
        self._user_subscriptions.clear()
        self._symbol_subscriptions.clear()
    
    @property
    def count(self) -> int:
        """Total active subscriptions."""
        return len(self._subscriptions)
    
    @property
    def active_users(self) -> int:
        """Number of users with active subscriptions."""
        return len(self._user_subscriptions)
    
    @property
    def active_symbols(self) -> int:
        """Number of symbols with active subscriptions."""
        return len(self._symbol_subscriptions)


# Global subscription manager instance
subscription_manager = SubscriptionManager()
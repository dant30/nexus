"""
Pydantic serializers for Deriv API responses.
Used for validation and schema generation.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, Field


# ============================================================================
# Market Data
# ============================================================================
class TickData(BaseModel):
    """Tick/quote data."""
    symbol: str
    bid: Decimal
    ask: Decimal
    price: Decimal
    timestamp: int
    
    class Config:
        from_attributes = True


class CandleData(BaseModel):
    """OHLCV candle data."""
    timestamp: int
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Optional[int] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Trade Data
# ============================================================================
class ContractProposal(BaseModel):
    """Contract proposal (pricing)."""
    id: str
    symbol: str
    contract_type: str
    bid_price: Decimal
    ask_price: Decimal
    spot: Decimal
    expiry: int
    payout: Decimal
    
    class Config:
        from_attributes = True


class ContractStatus(BaseModel):
    """Contract/trade status."""
    contract_id: int
    symbol: str
    contract_type: str
    entry_price: Decimal
    current_price: Optional[Decimal] = None
    payout: Optional[Decimal] = None
    status: str  # open, won, lost, cancelled
    profit: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Account Data
# ============================================================================
class AccountInfo(BaseModel):
    """Account information."""
    account_id: str
    account_type: str  # demo, real
    balance: Decimal
    currency: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class BalanceUpdate(BaseModel):
    """Balance update notification."""
    account_id: str
    balance: Decimal
    currency: str
    timestamp: int
    
    class Config:
        from_attributes = True


# ============================================================================
# API Responses
# ============================================================================
class DerivResponse(BaseModel):
    """Generic Deriv API response."""
    status: str  # success, error
    data: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


"""
Data serializers for Deriv WebSocket events.
"""
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

from shared.utils.logger import log_error, get_logger

logger = get_logger("deriv_serializers")


class DerivSerializer:
    """
    Serialize/deserialize Deriv API data.
    """
    
    @staticmethod
    def serialize_authorize(api_token: str, **kwargs) -> Dict[str, Any]:
        """
        Serialize authorization request.
        
        Args:
        - api_token: Deriv API token
        
        Returns:
        - Authorization request dict
        """
        return {
            "authorize": api_token,
        }
    
    @staticmethod
    def serialize_subscribe_ticks(
        symbol: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Serialize tick subscription request.
        
        Args:
        - symbol: Trading symbol (e.g., "EURUSD")
        
        Returns:
        - Subscription request dict
        """
        return {
            "ticks": symbol,
            "subscribe": 1,
        }
    
    @staticmethod
    def serialize_buy_contract(
        proposal_id: str,
        price: Decimal,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Serialize buy contract request.
        
        Args:
        - proposal_id: Proposal ID from proposal response
        - price: Accepted price
        
        Returns:
        - Buy request dict
        """
        return {
            "buy": proposal_id,
            "price": float(price),
        }
    
    @staticmethod
    def deserialize_tick(data: Dict[str, Any]) -> Optional[Dict]:
        """
        Deserialize tick data from Deriv.
        
        Args:
        - data: Raw tick data from Deriv
        
        Returns:
        - Parsed tick dict or None
        """
        try:
            if "tick" not in data:
                return None
            
            tick = data["tick"]
            return {
                "symbol": data.get("echo_req", {}).get("ticks"),
                "price": float(tick.get("quote", 0)),
                "bid": float(tick.get("bid", 0)),
                "ask": float(tick.get("ask", 0)),
                "time": tick.get("epoch"),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize tick", exception=e)
            return None
    
    @staticmethod
    def deserialize_balance(data: Dict[str, Any]) -> Optional[Decimal]:
        """
        Deserialize balance update from Deriv.
        
        Args:
        - data: Raw balance data
        
        Returns:
        - Balance as Decimal or None
        """
        try:
            if "balance" not in data:
                return None
            
            return Decimal(str(data["balance"]["balance"]))
        except Exception as e:
            log_error("Failed to deserialize balance", exception=e)
            return None
    
    @staticmethod
    def deserialize_proposal(data: Dict[str, Any]) -> Optional[Dict]:
        """
        Deserialize proposal response from Deriv.
        
        Args:
        - data: Raw proposal data
        
        Returns:
        - Parsed proposal dict or None
        """
        try:
            if "proposal" not in data:
                return None
            
            proposal = data["proposal"]
            return {
                "id": proposal.get("id"),
                "symbol": proposal.get("symbol"),
                "payout": Decimal(str(proposal.get("payout", 0))),
                "stake": Decimal(str(proposal.get("stake", 0))),
                "ask_price": Decimal(str(proposal.get("ask_price", 0))),
                "buy_threshold": Decimal(str(proposal.get("buy_threshold", 0))),
                "returned": proposal.get("returned"),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize proposal", exception=e)
            return None

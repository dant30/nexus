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
    def serialize_subscribe_candles(
        symbol: str,
        granularity: int,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Serialize candle subscription request.

        Args:
        - symbol: Trading symbol (e.g., "EURUSD")
        - granularity: Candle period in seconds

        Returns:
        - Subscription request dict
        """
        return {
            "ticks_history": symbol,
            "style": "candles",
            "subscribe": 1,
            "granularity": granularity,
            "count": 60,
            "end": "latest",
        }

    @staticmethod
    def serialize_proposal(
        symbol: str,
        contract_type: str,
        amount: Decimal,
        duration: int,
        duration_unit: str,
        currency: str,
        req_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Serialize contract proposal request.

        Args:
        - symbol: Trading symbol (e.g., "R_50")
        - contract_type: "CALL" or "PUT"
        - amount: Stake amount
        - duration: Contract duration (in duration_unit)
        - duration_unit: "t" | "s" | "m" | "h"
        - currency: Account currency (e.g., "USD")
        - req_id: Optional request id for correlation
        """
        payload = {
            "proposal": 1,
            "amount": float(amount),
            "basis": "stake",
            "contract_type": contract_type,
            "currency": currency,
            "duration": int(duration),
            "duration_unit": duration_unit,
            "symbol": symbol,
        }
        if req_id is not None:
            payload["req_id"] = req_id
        return payload

    @staticmethod
    def serialize_subscribe_open_contract(
        contract_id: int,
        req_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Serialize proposal_open_contract subscription request."""
        payload = {
            "proposal_open_contract": 1,
            "contract_id": contract_id,
            "subscribe": 1,
        }
        if req_id is not None:
            payload["req_id"] = req_id
        return payload
    
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
                "event": "tick",
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
    def deserialize_ohlc(data: Dict[str, Any]) -> Optional[Dict]:
        """
        Deserialize candle (OHLC) data from Deriv.
        """
        try:
            if "ohlc" not in data:
                return None
            candle = data["ohlc"]
            return {
                "event": "ohlc",
                "symbol": candle.get("symbol") or data.get("echo_req", {}).get("candles"),
                "time": candle.get("epoch"),
                "open": float(candle.get("open", 0)),
                "high": float(candle.get("high", 0)),
                "low": float(candle.get("low", 0)),
                "close": float(candle.get("close", 0)),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize ohlc", exception=e)
            return None

    @staticmethod
    def deserialize_candles(data: Dict[str, Any]) -> Optional[Dict]:
        """Deserialize candle snapshot list from Deriv."""
        try:
            if "candles" not in data:
                return None
            candles = data.get("candles", [])
            symbol = data.get("echo_req", {}).get("ticks_history")
            normalized = []
            for candle in candles:
                normalized.append({
                    "symbol": symbol,
                    "time": candle.get("epoch"),
                    "open": float(candle.get("open", 0)),
                    "high": float(candle.get("high", 0)),
                    "low": float(candle.get("low", 0)),
                    "close": float(candle.get("close", 0)),
                })
            return {
                "event": "candles",
                "symbol": symbol,
                "candles": normalized,
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize candles", exception=e)
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
    def deserialize_authorize(data: Dict[str, Any]) -> Optional[Dict]:
        """Deserialize authorize response from Deriv."""
        try:
            if "authorize" not in data:
                return None
            auth = data.get("authorize", {})
            return {
                "event": "authorize",
                "user_id": auth.get("user_id"),
                "loginid": auth.get("loginid"),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize authorize", exception=e)
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
                "event": "proposal",
                "id": proposal.get("id"),
                "req_id": data.get("req_id"),
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

    @staticmethod
    def deserialize_buy(data: Dict[str, Any]) -> Optional[Dict]:
        """Deserialize buy response."""
        try:
            if "buy" not in data:
                return None
            buy = data["buy"]
            return {
                "event": "buy",
                "contract_id": buy.get("contract_id"),
                "transaction_id": buy.get("transaction_id"),
                "buy_price": buy.get("buy_price"),
                "proposal_id": buy.get("buy"),
                "req_id": data.get("req_id"),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize buy", exception=e)
            return None

    @staticmethod
    def deserialize_open_contract(data: Dict[str, Any]) -> Optional[Dict]:
        """Deserialize proposal_open_contract updates."""
        try:
            if "proposal_open_contract" not in data:
                return None
            contract = data["proposal_open_contract"]
            return {
                "event": "proposal_open_contract",
                "contract_id": contract.get("contract_id"),
                "is_sold": contract.get("is_sold"),
                "status": contract.get("status"),
                "profit": contract.get("profit"),
                "payout": contract.get("payout"),
                "buy_price": contract.get("buy_price"),
                "sell_price": contract.get("sell_price"),
                "entry_tick": contract.get("entry_tick"),
                "exit_tick": contract.get("exit_tick"),
                "raw": data,
            }
        except Exception as e:
            log_error("Failed to deserialize open contract", exception=e)
            return None

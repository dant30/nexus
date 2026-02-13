"""
Pydantic serializers and data transformers for Deriv API.
Professional implementation with comprehensive validation and error handling.
"""
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, Field, ValidationError, field_validator
from shared.utils.logger import log_error, get_logger

logger = get_logger("deriv_serializer")


# ============================================================================
# Pydantic Models - Single source of truth for data shapes
# ============================================================================

class TickData(BaseModel):
    """Tick/quote data with validation."""
    symbol: str
    bid: Decimal = Field(..., ge=0)
    ask: Decimal = Field(..., ge=0)
    price: Decimal = Field(..., ge=0)
    timestamp: int = Field(..., gt=0)
    
    @field_validator('bid', 'ask', 'price', mode='before')
    @classmethod
    def convert_to_decimal(cls, v):
        return Decimal(str(v)) if v is not None else Decimal('0')


class CandleData(BaseModel):
    """OHLCV candle data with validation."""
    timestamp: int = Field(..., gt=0)
    open: Decimal = Field(..., ge=0)
    high: Decimal = Field(..., ge=0)
    low: Decimal = Field(..., ge=0)
    close: Decimal = Field(..., ge=0)
    volume: Optional[int] = None
    
    @field_validator('high')
    @classmethod
    def high_ge_open_close(cls, v, info):
        data = info.data
        if 'open' in data and v < data['open']:
            raise ValueError(f"high ({v}) < open ({data['open']})")
        if 'close' in data and v < data['close']:
            raise ValueError(f"high ({v}) < close ({data['close']})")
        return v
    
    @field_validator('low')
    @classmethod
    def low_le_open_close(cls, v, info):
        data = info.data
        if 'open' in data and v > data['open']:
            raise ValueError(f"low ({v}) > open ({data['open']})")
        if 'close' in data and v > data['close']:
            raise ValueError(f"low ({v}) > close ({data['close']})")
        return v


class ContractProposal(BaseModel):
    """Contract proposal (pricing) with validation."""
    id: str
    symbol: str
    contract_type: str
    bid_price: Decimal = Field(..., ge=0)
    ask_price: Decimal = Field(..., ge=0)
    spot: Decimal = Field(..., ge=0)
    expiry: int = Field(..., gt=0)
    payout: Decimal = Field(..., ge=0)


class ContractStatus(BaseModel):
    """Contract/trade status with validation."""
    contract_id: int
    symbol: str
    contract_type: str
    entry_price: Decimal = Field(..., ge=0)
    current_price: Optional[Decimal] = None
    payout: Optional[Decimal] = None
    status: str  # open, won, lost, cancelled
    profit: Optional[Decimal] = None


class BalanceUpdate(BaseModel):
    """Balance update notification."""
    account_id: str
    balance: Decimal = Field(..., ge=0)
    currency: str
    timestamp: int = Field(..., gt=0)


class AccountInfo(BaseModel):
    """Account information."""
    account_id: str
    account_type: str  # demo, real
    balance: Decimal = Field(..., ge=0)
    currency: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


# ============================================================================
# Serializer - Transform Deriv API data to internal models
# ============================================================================

class DerivSerializer:
    """
    Professional serializer for Deriv WebSocket API.
    
    Responsibilities:
    - Transform raw Deriv messages to typed models
    - Validate all incoming data
    - Handle edge cases gracefully
    - Provide consistent error logging
    """
    
    # Request builders
    @staticmethod
    def authorize(api_token: str) -> Dict[str, Any]:
        """Build authorize request."""
        return {"authorize": api_token}
    
    @staticmethod
    def subscribe_ticks(symbol: str) -> Dict[str, Any]:
        """Build tick subscription request."""
        return {"ticks": symbol, "subscribe": 1}
    
    @staticmethod
    def subscribe_candles(symbol: str, granularity: int) -> Dict[str, Any]:
        """Build candle subscription request."""
        return {
            "ticks_history": symbol,
            "style": "candles",
            "subscribe": 1,
            "granularity": granularity,
            "count": 60,
            "end": "latest",
        }
    
    @staticmethod
    def proposal(
        symbol: str,
        contract_type: str,
        amount: Union[Decimal, float, str],
        duration: int,
        duration_unit: str,
        currency: str,
        req_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Build contract proposal request."""
        payload = {
            "proposal": 1,
            "amount": float(Decimal(str(amount))),
            "basis": "stake",
            "contract_type": contract_type,
            "currency": currency,
            "duration": duration,
            "duration_unit": duration_unit,
            "symbol": symbol,
        }
        if req_id:
            payload["req_id"] = req_id
        return payload
    
    @staticmethod
    def buy_contract(proposal_id: str, price: Union[Decimal, float, str]) -> Dict[str, Any]:
        """Build buy contract request."""
        return {"buy": proposal_id, "price": float(Decimal(str(price)))}
    
    @staticmethod
    def subscribe_open_contract(contract_id: int, req_id: Optional[str] = None) -> Dict[str, Any]:
        """Build open contract subscription request."""
        payload = {"proposal_open_contract": 1, "contract_id": contract_id, "subscribe": 1}
        if req_id:
            payload["req_id"] = req_id
        return payload
    
    # Response deserializers
    @staticmethod
    def deserialize_tick(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize tick data to internal format."""
        try:
            if "tick" not in data:
                return None
            
            tick = data["tick"]
            result = {
                "event": "tick",
                "symbol": data.get("echo_req", {}).get("ticks"),
                "price": float(tick.get("quote", 0)),
                "bid": float(tick.get("bid", 0)),
                "ask": float(tick.get("ask", 0)),
                "timestamp": tick.get("epoch"),
                "raw": data,
            }
            
            # Validate with Pydantic
            TickData(
                symbol=result["symbol"],
                bid=result["bid"],
                ask=result["ask"],
                price=result["price"],
                timestamp=result["timestamp"],
            )
            
            return result
        
        except (ValidationError, ValueError, TypeError, KeyError) as e:
            log_error("Failed to deserialize tick", exception=e)
            return None
    
    @staticmethod
    def deserialize_ohlc(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize OHLC (candle) data to internal format."""
        try:
            if "ohlc" not in data:
                return None
            
            candle = data["ohlc"]
            result = {
                "event": "ohlc",
                "symbol": candle.get("symbol") or data.get("echo_req", {}).get("candles"),
                "timestamp": candle.get("epoch"),
                "open": float(candle.get("open", 0)),
                "high": float(candle.get("high", 0)),
                "low": float(candle.get("low", 0)),
                "close": float(candle.get("close", 0)),
                "raw": data,
            }
            
            # Validate with Pydantic
            CandleData(
                timestamp=result["timestamp"],
                open=result["open"],
                high=result["high"],
                low=result["low"],
                close=result["close"],
            )
            
            return result
        
        except (ValidationError, ValueError, TypeError, KeyError) as e:
            log_error("Failed to deserialize ohlc", exception=e)
            return None
    
    @staticmethod
    def deserialize_candles(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize candle snapshot list to internal format."""
        try:
            if "candles" not in data:
                return None
            
            candles = data.get("candles", [])
            symbol = data.get("echo_req", {}).get("ticks_history")
            
            normalized = []
            for candle in candles[:100]:  # Limit to prevent memory issues
                try:
                    normalized.append({
                        "symbol": symbol,
                        "timestamp": candle.get("epoch"),
                        "open": float(candle.get("open", 0)),
                        "high": float(candle.get("high", 0)),
                        "low": float(candle.get("low", 0)),
                        "close": float(candle.get("close", 0)),
                    })
                except Exception as e:
                    logger.warning(f"Failed to parse candle: {e}")
                    continue
            
            return {
                "event": "candles",
                "symbol": symbol,
                "candles": normalized,
                "count": len(normalized),
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize candles", exception=e)
            return None
    
    @staticmethod
    def deserialize_balance(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize balance update."""
        try:
            if "balance" not in data:
                return None
            
            balance = data["balance"]
            return {
                "event": "balance",
                "balance": float(balance.get("balance", 0)),
                "currency": balance.get("currency"),
                "account_id": balance.get("loginid"),
                "timestamp": balance.get("timestamp"),
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize balance", exception=e)
            return None
    
    @staticmethod
    def deserialize_authorize(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize authorize response."""
        try:
            if "authorize" not in data:
                return None
            
            auth = data.get("authorize", {})
            return {
                "event": "authorize",
                "user_id": auth.get("user_id"),
                "loginid": auth.get("loginid"),
                "email": auth.get("email"),
                "currency": auth.get("currency"),
                "balance": float(auth.get("balance", 0)),
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize authorize", exception=e)
            return None
    
    @staticmethod
    def deserialize_proposal(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize proposal response."""
        try:
            if "proposal" not in data:
                return None
            
            proposal = data["proposal"]
            return {
                "event": "proposal",
                "id": proposal.get("id"),
                "req_id": data.get("req_id"),
                "symbol": proposal.get("symbol"),
                "contract_type": proposal.get("contract_type"),
                "payout": float(proposal.get("payout", 0)),
                "stake": float(proposal.get("stake", 0)),
                "ask_price": float(proposal.get("ask_price", 0)),
                "buy_threshold": float(proposal.get("buy_threshold", 0)),
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize proposal", exception=e)
            return None
    
    @staticmethod
    def deserialize_buy(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize buy response."""
        try:
            if "buy" not in data:
                return None
            
            buy = data["buy"]
            return {
                "event": "buy",
                "contract_id": buy.get("contract_id"),
                "transaction_id": buy.get("transaction_id"),
                "buy_price": float(buy.get("buy_price", 0)),
                "proposal_id": buy.get("buy"),
                "req_id": data.get("req_id"),
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize buy", exception=e)
            return None
    
    @staticmethod
    def deserialize_open_contract(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Deserialize proposal_open_contract updates."""
        try:
            if "proposal_open_contract" not in data:
                return None
            
            contract = data["proposal_open_contract"]
            return {
                "event": "proposal_open_contract",
                "contract_id": contract.get("contract_id"),
                "is_sold": contract.get("is_sold", False),
                "status": contract.get("status"),
                "profit": float(contract.get("profit", 0)) if contract.get("profit") else None,
                "payout": float(contract.get("payout", 0)) if contract.get("payout") else None,
                "buy_price": float(contract.get("buy_price", 0)),
                "sell_price": float(contract.get("sell_price", 0)) if contract.get("sell_price") else None,
                "entry_tick": float(contract.get("entry_tick", 0)) if contract.get("entry_tick") else None,
                "exit_tick": float(contract.get("exit_tick", 0)) if contract.get("exit_tick") else None,
                "raw": data,
            }
        
        except Exception as e:
            log_error("Failed to deserialize open contract", exception=e)
            return None
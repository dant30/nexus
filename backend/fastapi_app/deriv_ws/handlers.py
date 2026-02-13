"""
Professional event handlers for Deriv WebSocket messages.
Processes and transforms Deriv data for internal use.
"""
from typing import Dict, Any, Optional

from .events import DerivEventType
from .serializers import DerivSerializer
from .connection_pool import pool
from shared.utils.logger import log_info, log_error, log_warning, log_debug, get_logger

logger = get_logger("deriv_handlers")


def broadcast_balance_update(account_id: int, balance: float, currency: Optional[str] = None) -> None:
    """Best-effort broadcast of balance updates to connected frontend WS clients."""
    # Handle case where account_id might be a string like "CR123456"
    if isinstance(account_id, str):
        try:
            # Extract numeric part if possible
            import re
            match = re.search(r'(\d+)$', account_id)
            if match:
                account_id = int(match.group(1))
            else:
                account_id = 0
        except:
            account_id = 0
    
    payload = {
        "type": "balance_update",
        "data": {
            "account_id": account_id,
            "balance": float(balance),
            "currency": currency,
        },
    }
    pool.broadcast(payload)
    log_info("Broadcasted balance update", account_id=account_id, balance=float(balance), currency=currency)


def broadcast_trade_update(update: Dict[str, Any]) -> None:
    """Best-effort broadcast of trade/contract updates to connected frontend WS clients."""
    payload = {
        "type": "trade_update",
        "data": update,
    }
    pool.broadcast(payload)
    log_info("Broadcasted trade update", contract_id=update.get("contract_id"), status=update.get("status"))


class DerivEventHandler:
    """
    Professional event handler for Deriv WebSocket messages.
    
    Responsibilities:
    - Route messages to appropriate handlers
    - Transform raw data to internal format
    - Update subscription state
    - Broadcast relevant updates
    - Error recovery
    """
    
    def __init__(self):
        self.handlers = {
            DerivEventType.TICK: self._handle_tick,
            DerivEventType.CANDLE: self._handle_ohlc,
            DerivEventType.BALANCE: self._handle_balance,
            DerivEventType.PROPOSAL: self._handle_proposal,
            DerivEventType.BUY: self._handle_buy,
            DerivEventType.PROPOSAL_OPEN_CONTRACT: self._handle_open_contract,
            DerivEventType.AUTHORIZE: self._handle_authorize,
            "candles": self._handle_candles_snapshot,  # Special case for snapshots
            "error": self._handle_error,
        }
    
    async def handle(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Main entry point - handle incoming Deriv message.
        
        Args:
            data: Raw message from Deriv
        
        Returns:
            Processed message or None
        """
        try:
            # Determine message type
            event_type = None
            for key in data.keys():
                if key in self.handlers:
                    event_type = key
                    break
            
            if event_type and event_type in self.handlers:
                handler = self.handlers[event_type]
                return await handler(data)
            else:
                log_debug("Unhandled message type", keys=list(data.keys()))
                return None
        
        except Exception as e:
            log_error("Event handling failed", exception=e)
            return None
    
    async def _handle_tick(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle tick update."""
        tick = DerivSerializer.deserialize_tick(data)
        if tick:
            log_debug("Tick received", symbol=tick.get("symbol"), price=tick.get("price"))
        return tick
    
    async def _handle_ohlc(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle OHLC (candle) update."""
        candle = DerivSerializer.deserialize_ohlc(data)
        if candle:
            log_debug("Candle received", symbol=candle.get("symbol"), close=candle.get("close"))
        return candle
    
    async def _handle_candles_snapshot(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle candle snapshot list."""
        snapshot = DerivSerializer.deserialize_candles(data)
        if snapshot:
            log_info(
                "Candle snapshot received",
                symbol=snapshot.get("symbol"),
                count=len(snapshot.get("candles") or []),
            )
        return snapshot
    
    async def _handle_balance(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle balance update."""
        balance = DerivSerializer.deserialize_balance(data)
        
        if balance:
            log_info(
                "Balance update received",
                account_id=balance.get("account_id"),
                balance=balance.get("balance"),
                currency=balance.get("currency", "USD"),
            )
            
            # Broadcast to frontend
            try:
                account_key = balance.get("account_id")
                if account_key is not None:
                    account_id = int(str(account_key).split("_")[-1]) if isinstance(account_key, str) else int(account_key)
                    broadcast_balance_update(
                        account_id=account_id,
                        balance=float(balance.get("balance") or 0),
                        currency=balance.get("currency"),
                    )
            except Exception as e:
                log_error("Failed to broadcast balance", exception=e)
        
        return balance
    
    async def _handle_proposal(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle contract proposal."""
        proposal = DerivSerializer.deserialize_proposal(data)
        if proposal:
            log_info("Proposal received", proposal_id=proposal.get("id"), symbol=proposal.get("symbol"), ask_price=proposal.get("ask_price"))
        return proposal
    
    async def _handle_buy(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle buy confirmation."""
        buy = DerivSerializer.deserialize_buy(data)
        if buy:
            log_info(
                "Buy confirmed",
                contract_id=buy.get("contract_id"),
                transaction_id=buy.get("transaction_id"),
                price=buy.get("buy_price"),
            )
        return buy
    
    async def _handle_open_contract(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle open contract updates."""
        update = DerivSerializer.deserialize_open_contract(data)
        
        if update:
            status = update.get('status')
            is_sold = update.get('is_sold', False)
            
            if is_sold:
                profit = update.get('profit', 0)
                log_info(
                    "Contract closed",
                    contract_id=update.get("contract_id"),
                    profit=profit,
                    status=status,
                )
            else:
                log_debug("Contract update", contract_id=update.get("contract_id"), status=status)
            
            # Broadcast to frontend
            try:
                broadcast_trade_update(update)
            except Exception as e:
                log_error("Failed to broadcast trade update", exception=e)
        
        return update
    
    async def _handle_authorize(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle authorize response."""
        auth = DerivSerializer.deserialize_authorize(data)
        if auth:
            log_info(
                "Authorization successful",
                loginid=auth.get("loginid"),
                balance=auth.get("balance"),
            )
        return auth
    
    async def _handle_error(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle error message."""
        error = data.get("error", {})
        code = error.get("code", "Unknown")
        message = error.get("message", "Unknown error")
        
        log_error(f"Deriv error: {message}", code=code)
        
        return {
            "event": "error",
            "code": code,
            "message": message,
            "raw": data,
        }


# Global handler instance
handler = DerivEventHandler()

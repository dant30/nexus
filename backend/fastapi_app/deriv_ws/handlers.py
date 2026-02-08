"""
Event handlers for Deriv WebSocket messages.
"""
from typing import Dict, Any, Callable, Optional
from decimal import Decimal
import json

from .events import DerivEventType
from .serializers import DerivSerializer
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("deriv_handlers")


class DerivEventHandler:
    """
    Handle Deriv WebSocket events.
    """
    
    def __init__(self):
        """Initialize event handler."""
        self.handlers: Dict[str, Callable] = {
            DerivEventType.TICK: self._handle_tick,
            DerivEventType.BALANCE: self._handle_balance,
            DerivEventType.PROPOSAL: self._handle_proposal,
        }
    
    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict]:
        """
        Handle incoming WebSocket message from Deriv.
        
        Args:
        - message: Raw message dict from Deriv
        
        Returns:
        - Processed message or None
        """
        try:
            # Determine message type
            if "tick" in message:
                return await self._handle_tick(message)
            elif "balance" in message:
                return await self._handle_balance(message)
            elif "proposal"in message:
                return await self._handle_proposal(message)
            elif "error" in message:
                return await self._handle_error(message)
            else:
                log_info("Unknown message type", raw_message=str(message))
                return None
        
        except Exception as e:
            log_error("Error handling message", exception=e, raw_message=str(message))
            return None
    
    async def _handle_tick(self, data: Dict[str, Any]) -> Optional[Dict]:
        """Handle tick update."""
        tick = DerivSerializer.deserialize_tick(data)
        if tick:
            log_info(f"Tick received: {tick['symbol']} @ {tick['price']}")
        return tick
    
    async def _handle_balance(self, data: Dict[str, Any]) -> Optional[Dict]:
        """Handle balance update."""
        balance = DerivSerializer.deserialize_balance(data)
        if balance:
            log_info(f"Balance updated: {balance}")
            return {"balance": float(balance)}
        return None
    
    async def _handle_proposal(self, data: Dict[str, Any]) -> Optional[Dict]:
        """Handle proposal response."""
        proposal = DerivSerializer.deserialize_proposal(data)
        if proposal:
            log_info(f"Proposal received: {proposal['id']} @ {proposal['ask_price']}")
        return proposal
    
    async def _handle_error(self, data: Dict[str, Any]) -> Dict:
        """Handle error message."""
        error = data.get("error", {})
        code = error.get("code")
        message = error.get("message", "Unknown error")
        
        log_error(f"Deriv error: {message}", code=code)
        
        return {
            "type": "error",
            "code": code,
            "message": message,
        }

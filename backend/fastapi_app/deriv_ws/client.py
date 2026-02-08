"""
WebSocket client for Deriv API.
Handles connection, authentication, and message exchange.
"""

import asyncio
import json
from typing import Optional, Callable, Dict, Any
from datetime import datetime

import websockets
from websockets.exceptions import ConnectionClosed

from .events import WebSocketStatus, DerivEventType
from .handlers import DerivEventHandler
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("deriv_client")


class DerivWebSocketClient:
    """
    WebSocket client for Deriv API.
    
    Features:
    - Auto-reconnection with exponential backoff
    - Message queuing during disconnect
    - Event handling
    - Graceful shutdown
    """
    
    DERIV_WS_URL = "wss://ws.derivws.com/ws"
    RECONNECT_DELAY = 3  # Start with 3 seconds
    MAX_RECONNECT_DELAY = 300  # Cap at 5 minutes
    
    def __init__(self, app_id: str, api_token: str):
        """
        Initialize Deriv WebSocket client.
        
        Args:
        - app_id: Deriv app ID
        - api_token: Deriv API token
        """
        self.app_id = app_id
        self.api_token = api_token
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.status = WebSocketStatus.DISCONNECTED
        self.handler = DerivEventHandler()
        self.reconnect_delay = self.RECONNECT_DELAY
        self.message_queue: list = []
        self.callback: Optional[Callable] = None
    
    async def connect(self) -> bool:
        """
        Connect to Deriv WebSocket.
        
        Returns:
        - True if connected, False otherwise
        """
        try:
            self.status = WebSocketStatus.CONNECTING
            log_info("Connecting to Deriv WebSocket")
            
            self.ws = await websockets.connect(self.DERIV_WS_URL)
            self.status = WebSocketStatus.CONNECTED
            self.reconnect_delay = self.RECONNECT_DELAY
            
            log_info("Connected to Deriv")
            
            # Authorize
            await self.authorize()
            
            # Start message loop
            asyncio.create_task(self._message_loop())
            
            return True
        
        except Exception as e:
            log_error("Failed to connect to Deriv", exception=e)
            self.status = WebSocketStatus.FAILED
            return False
    
    async def authorize(self) -> bool:
        """
        Authorize WebSocket connection.
        
        Returns:
        - True if authorized, False otherwise
        """
        try:
            request = {
                "authorize": self.api_token,
            }
            
            await self.send(request)
            self.status = WebSocketStatus.AUTHORIZED
            
            log_info("Authorized with Deriv")
            return True
        
        except Exception as e:
            log_error("Authorization failed", exception=e)
            return False
    
    async def subscribe_ticks(self, symbol: str) -> bool:
        """
        Subscribe to tick updates for a symbol.
        
        Args:
        - symbol: Trading symbol
        
        Returns:
        - True if subscribed, False otherwise
        """
        try:
            request = {
                "ticks": symbol,
                "subscribe": 1,
            }
            
            await self.send(request)
            log_info(f"Subscribed to ticks: {symbol}")
            return True
        
        except Exception as e:
            log_error(f"Failed to subscribe to ticks: {symbol}", exception=e)
            return False
    
    async def send(self, data: Dict[str, Any]) -> bool:
        """
        Send message to Deriv.
        
        Args:
        - data: Message dict
        
        Returns:
        - True if sent, False otherwise
        """
        try:
            if self.status != WebSocketStatus.AUTHORIZED:
                self.message_queue.append(data)
                return False
            
            if self.ws is None:
                self.message_queue.append(data)
                return False
            
            message = json.dumps(data)
            await self.ws.send(message)
            
            return True
        
        except Exception as e:
            log_error("Failed to send message", exception=e)
            self.message_queue.append(data)
            return False
    
    async def _message_loop(self):
        """
        Main message processing loop.
        Receives and handles messages from Deriv.
        """
        try:
            while self.status in [WebSocketStatus.CONNECTED, WebSocketStatus.AUTHORIZED]:
                if self.ws is None:
                    break
                
                try:
                    # Receive message
                    raw_message = await self.ws.recv()
                    message = json.loads(raw_message)
                    
                    # Process message
                    result = await self.handler.handle_message(message)
                    
                    # Call callback if registered
                    if self.callback and result:
                        try:
                            await self.callback(result)
                        except Exception as e:
                            log_error("Callback error", exception=e)
                
                except json.JSONDecodeError as e:
                    log_error("Invalid JSON received", exception=e)
                except ConnectionClosed:
                    log_info("Connection closed by server")
                    break
        
        except Exception as e:
            log_error("Message loop error", exception=e)
        
        finally:
            await self._attempt_reconnect()
    
    async def _attempt_reconnect(self):
        """Attempt to reconnect with exponential backoff."""
        self.status = WebSocketStatus.RECONNECTING
        
        while True:
            try:
                log_info(f"Reconnecting in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
                
                if await self.connect():
                    return
                
                # Exponential backoff
                self.reconnect_delay = min(
                    self.reconnect_delay * 2,
                    self.MAX_RECONNECT_DELAY,
                )
            
            except Exception as e:
                log_error("Reconnection failed", exception=e)
    
    async def disconnect(self):
        """Disconnect from Deriv WebSocket."""
        self.status = WebSocketStatus.DISCONNECTED
        
        if self.ws:
            try:
                await self.ws.close()
            except Exception as e:
                log_error("Error closing WebSocket", exception=e)
    
    def on_message(self, callback: Callable):
        """
        Register callback for message events.
        
        Args:
        - callback: Async callable to handle messages
        """
        self.callback = callback

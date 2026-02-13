"""
Professional WebSocket client for Deriv API.
Production-ready with comprehensive error handling, retry logic, and connection management.
"""
import asyncio
import json
import time
from typing import Optional, Callable, Dict, Any, Union
from decimal import Decimal
from datetime import datetime

import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from .events import WebSocketStatus, DerivEventType, subscription_manager
from .serializers import DerivSerializer
from shared.utils.logger import log_info, log_error, log_warning, get_logger

logger = get_logger("deriv_client")


class DerivWebSocketClient:
    """
    Professional WebSocket client for Deriv API.
    
    Features:
    - Auto-reconnection with exponential backoff
    - Request/response correlation with req_id
    - Message queuing during disconnect
    - Comprehensive error handling
    - Graceful shutdown
    - Subscription tracking
    - Performance monitoring
    """
    
    # Configuration
    DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3"
    RECONNECT_DELAY = 3  # seconds
    MAX_RECONNECT_DELAY = 60  # seconds
    MAX_RETRY_ATTEMPTS = 3
    RETRY_DELAY = 1  # seconds
    PING_INTERVAL = 30  # seconds
    PING_TIMEOUT = 10  # seconds
    
    def __init__(self, app_id: str, api_token: str, user_id: Optional[int] = None):
        """
        Initialize Deriv WebSocket client.
        
        Args:
            app_id: Deriv app ID
            api_token: Deriv API token
            user_id: Nexus user ID (for subscription tracking), optional for shared app client
        """
        self.app_id = app_id
        self.api_token = api_token
        self.user_id = user_id
        self.connection_key = f"deriv_{user_id}" if user_id is not None else "deriv_shared"
        
        # Connection state
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.status = WebSocketStatus.DISCONNECTED
        self.reconnect_delay = self.RECONNECT_DELAY
        
        # Message handling
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.pending_requests: Dict[int, asyncio.Future] = {}
        self.event_handlers: Dict[str, Callable] = {}
        self._last_req_id = int(time.time() * 1000)
        
        # Callbacks
        self.message_callback: Optional[Callable] = None
        
        # Tasks
        self._receiver_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        self._queue_processor_task: Optional[asyncio.Task] = None
        
        # Metrics
        self.messages_sent = 0
        self.messages_received = 0
        self.reconnect_count = 0
        self.last_message_time: Optional[datetime] = None
    
    async def connect(self) -> bool:
        """
        Establish WebSocket connection to Deriv.
        
        Returns:
            True if connected successfully, False otherwise
        """
        if self.status in [WebSocketStatus.CONNECTED, WebSocketStatus.AUTHORIZED]:
            return True
        
        self.status = WebSocketStatus.CONNECTING
        
        try:
            # Build URL with app_id
            url = f"{self.DERIV_WS_URL}?app_id={self.app_id}"
            
            log_info("Connecting to Deriv", url=url, user_id=self.user_id)
            
            # Connect with timeout
            self.ws = await asyncio.wait_for(
                websockets.connect(url, ping_interval=self.PING_INTERVAL, ping_timeout=self.PING_TIMEOUT),
                timeout=15
            )
            
            self.status = WebSocketStatus.CONNECTED
            self.reconnect_delay = self.RECONNECT_DELAY
            self.reconnect_count = 0
            
            # Start background tasks
            self._receiver_task = asyncio.create_task(self._receiver_loop())
            self._queue_processor_task = asyncio.create_task(self._queue_processor_loop())
            self._ping_task = asyncio.create_task(self._ping_loop())
            
            # Authorize connection
            if not await self.authorize():
                await self.disconnect()
                return False
            
            log_info("Connected to Deriv", user_id=self.user_id)
            return True
        
        except asyncio.TimeoutError:
            log_error("Connection timeout", user_id=self.user_id)
            self.status = WebSocketStatus.ERROR
            return False
        
        except Exception as e:
            log_error("Failed to connect", exception=e, user_id=self.user_id)
            self.status = WebSocketStatus.ERROR
            return False
    
    async def authorize(self) -> bool:
        """
        Authorize WebSocket connection with API token.
        
        Returns:
            True if authorized successfully, False otherwise
        """
        try:
            # Generate request ID for correlation
            req_id = self._next_req_id()
            future = asyncio.get_event_loop().create_future()
            self.pending_requests[req_id] = future
            
            # Send authorize request
            request = DerivSerializer.authorize(self.api_token)
            request["req_id"] = req_id
            await self._send_raw(request)
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(future, timeout=15)
                
                if response and "authorize" in response:
                    self.status = WebSocketStatus.AUTHORIZED
                    log_info("Authorization successful", user_id=self.user_id)
                    return True
                else:
                    log_error("Authorization failed", response=response)
                    return False
            
            except asyncio.TimeoutError:
                log_error("Authorization timeout")
                return False
            
            finally:
                self.pending_requests.pop(req_id, None)
        
        except Exception as e:
            log_error("Authorization error", exception=e)
            return False
    
    async def send(self, data: Dict[str, Any], retry_on_failure: bool = True) -> bool:
        """
        Send message to Deriv with automatic queuing if disconnected.
        
        Args:
            data: Message to send
            retry_on_failure: Whether to retry on failure
        
        Returns:
            True if queued/sent successfully, False otherwise
        """
        if self.status != WebSocketStatus.AUTHORIZED:
            if retry_on_failure:
                await self.message_queue.put(data)
                log_debug("Message queued (not authorized)", user_id=self.user_id)
                return True
            return False
        
        return await self._send_raw(data)
    
    async def _send_raw(self, data: Dict[str, Any]) -> bool:
        """Low-level send with error handling."""
        try:
            if self.ws is None:
                return False
            
            message = json.dumps(data)
            await self.ws.send(message)
            
            self.messages_sent += 1
            self.last_message_time = datetime.utcnow()
            
            return True
        
        except ConnectionClosed:
            log_warning("Connection closed while sending", user_id=self.user_id)
            self.status = WebSocketStatus.DISCONNECTED
            asyncio.create_task(self._reconnect())
            return False
        
        except Exception as e:
            log_error("Send failed", exception=e)
            return False
    
    async def request(
        self,
        data: Dict[str, Any],
        timeout: float = 15.0,
        retry_count: int = 0,
    ) -> Optional[Dict[str, Any]]:
        """
        Send request and wait for response.
        
        Args:
            data: Request data
            timeout: Timeout in seconds
            retry_count: Number of retry attempts
        
        Returns:
            Response data or None on timeout/error
        """
        req_id = self._next_req_id()
        data["req_id"] = req_id
        
        future = asyncio.get_event_loop().create_future()
        self.pending_requests[req_id] = future
        
        try:
            if not await self.send(data):
                return None
            
            try:
                response = await asyncio.wait_for(future, timeout=timeout)
                return response
            except asyncio.TimeoutError:
                log_warning(f"Request timeout", req_id=req_id)
                return None
        
        finally:
            self.pending_requests.pop(req_id, None)

    def _next_req_id(self) -> int:
        """
        Deriv requires integer req_id; keep it strictly monotonic to avoid collisions.
        """
        now_ms = int(time.time() * 1000)
        if now_ms <= self._last_req_id:
            now_ms = self._last_req_id + 1
        self._last_req_id = now_ms
        return now_ms
    
    # ========== Public API Methods ==========
    
    async def subscribe_ticks(self, symbol: str) -> bool:
        """Subscribe to real-time ticks for a symbol."""
        # Check if already subscribed
        existing = subscription_manager.get_by_user_symbol_event(
            self.user_id, symbol, DerivEventType.TICK.value
        )
        if existing:
            return True
        
        # Send subscription request
        request = DerivSerializer.subscribe_ticks(symbol)
        response = await self.request(request, timeout=10)
        
        if response and "subscription" in response:
            sub_id = response["subscription"]["id"]
            subscription_manager.add(
                sub_id, DerivEventType.TICK.value, symbol, self.user_id
            )
            log_info("Subscribed to ticks", symbol=symbol, sub_id=sub_id)
            return True
        
        return False
    
    async def subscribe_candles(self, symbol: str, granularity: int = 60) -> bool:
        """Subscribe to real-time candles for a symbol."""
        # Check if already subscribed
        existing = subscription_manager.get_by_user_symbol_event(
            self.user_id, symbol, DerivEventType.CANDLE.value
        )
        if existing:
            return True
        
        # Send subscription request
        request = DerivSerializer.subscribe_candles(symbol, granularity)
        response = await self.request(request, timeout=10)
        
        if response and "subscription" in response:
            sub_id = response["subscription"]["id"]
            subscription_manager.add(
                sub_id, DerivEventType.CANDLE.value, symbol, self.user_id
            )
            log_info("Subscribed to candles", symbol=symbol, sub_id=sub_id)
            return True
        
        return False
    
    async def request_proposal(
        self,
        symbol: str,
        contract_type: str,
        amount: Union[Decimal, float, str],
        duration: int,
        duration_unit: str,
        currency: str = "USD",
    ) -> Optional[Dict[str, Any]]:
        """Request a contract proposal."""
        request = DerivSerializer.proposal(
            symbol=symbol,
            contract_type=contract_type,
            amount=amount,
            duration=duration,
            duration_unit=duration_unit,
            currency=currency,
        )
        return await self.request(request, timeout=10, retry_count=2)
    
    async def buy_contract(
        self,
        proposal_id: str,
        price: Union[Decimal, float, str],
    ) -> Optional[Dict[str, Any]]:
        """Execute a contract purchase."""
        request = DerivSerializer.buy_contract(proposal_id, price)
        return await self.request(request, timeout=15, retry_count=1)
    
    async def subscribe_open_contract(self, contract_id: int) -> bool:
        """Subscribe to open contract updates."""
        request = DerivSerializer.subscribe_open_contract(contract_id)
        response = await self.request(request, timeout=10)
        return response is not None
    
    # ========== Event Handling ==========
    
    def on_message(self, callback: Callable):
        """Register callback for all messages."""
        self.message_callback = callback
    
    def on_event(self, event_type: str, callback: Callable):
        """Register callback for specific event type."""
        self.event_handlers[event_type] = callback
    
    async def _receiver_loop(self):
        """Main message receiver loop."""
        try:
            while self.status in [WebSocketStatus.CONNECTED, WebSocketStatus.AUTHORIZED]:
                try:
                    if self.ws is None:
                        break
                    
                    # Receive message with timeout
                    message = await asyncio.wait_for(self.ws.recv(), timeout=30)
                    self.messages_received += 1
                    self.last_message_time = datetime.utcnow()
                    
                    # Parse JSON
                    try:
                        data = json.loads(message)
                    except json.JSONDecodeError:
                        log_error("Invalid JSON received")
                        continue
                    
                    # Handle response correlation
                    req_id = data.get("req_id")
                    if req_id and req_id in self.pending_requests:
                        future = self.pending_requests.pop(req_id)
                        if not future.done():
                            future.set_result(data)
                    
                    # Dispatch to event handlers
                    await self._dispatch_event(data)
                    
                    # Call general callback
                    if self.message_callback:
                        try:
                            await self.message_callback(data)
                        except Exception as e:
                            log_error("Message callback error", exception=e)
                
                except asyncio.TimeoutError:
                    # Normal timeout, continue
                    continue
                
                except ConnectionClosed:
                    log_info("Connection closed", user_id=self.user_id)
                    break
                
                except Exception as e:
                    log_error("Receiver error", exception=e)
                    break
        
        except Exception as e:
            log_error("Receiver loop error", exception=e)
        
        finally:
            # Trigger reconnect if not disconnected intentionally
            if self.status not in [WebSocketStatus.DISCONNECTED]:
                asyncio.create_task(self._reconnect())
    
    async def _dispatch_event(self, data: Dict[str, Any]):
        """Dispatch message to registered event handlers."""
        # Determine event type
        event_type = None
        for key in data.keys():
            if key in DerivEventType.__members__.values() or key in ["tick", "ohlc", "candles", "balance"]:
                event_type = key
                break
        
        if event_type and event_type in self.event_handlers:
            try:
                await self.event_handlers[event_type](data)
            except Exception as e:
                log_error(f"Event handler error", exception=e, event=event_type)
    
    async def _queue_processor_loop(self):
        """Process queued messages when connection is ready."""
        while True:
            try:
                # Wait for message
                message = await self.message_queue.get()
                
                # Wait for authorization
                while self.status != WebSocketStatus.AUTHORIZED:
                    if self.status == WebSocketStatus.DISCONNECTED:
                        break
                    await asyncio.sleep(0.5)
                
                # Send message
                await self._send_raw(message)
                self.message_queue.task_done()
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                log_error("Queue processor error", exception=e)
    
    async def _ping_loop(self):
        """Periodic ping to keep connection alive."""
        try:
            while self.status == WebSocketStatus.AUTHORIZED:
                await asyncio.sleep(self.PING_INTERVAL)
                
                # Check if we've received messages recently
                if self.last_message_time:
                    idle_seconds = (datetime.utcnow() - self.last_message_time).total_seconds()
                    if idle_seconds > self.PING_INTERVAL * 2:
                        log_warning("Connection idle, sending ping", idle_seconds=idle_seconds)
                
                # Send ping
                await self._send_raw({"ping": 1})
        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log_error("Ping loop error", exception=e)
    
    async def _reconnect(self):
        """Reconnect with exponential backoff."""
        if self.status == WebSocketStatus.RECONNECTING:
            return
        
        self.status = WebSocketStatus.RECONNECTING
        self.reconnect_count += 1
        
        log_info("Reconnecting", attempt=self.reconnect_count, delay=self.reconnect_delay)
        
        await asyncio.sleep(self.reconnect_delay)
        
        # Exponential backoff
        self.reconnect_delay = min(
            self.reconnect_delay * 1.5,
            self.MAX_RECONNECT_DELAY
        )
        
        # Attempt reconnection
        await self.connect()
    
    async def disconnect(self):
        """Gracefully disconnect from Deriv."""
        self.status = WebSocketStatus.DISCONNECTED
        
        # Cancel background tasks
        for task in [self._receiver_task, self._ping_task, self._queue_processor_task]:
            if task and not task.done():
                task.cancel()
        
        # Close WebSocket
        if self.ws:
            try:
                await self.ws.close()
            except Exception as e:
                log_error("Error closing WebSocket", exception=e)
            finally:
                self.ws = None
        
        # Clear subscriptions for this user
        if self.user_id is not None:
            subscription_manager.remove_by_user(self.user_id)
        
        # Clear pending requests
        for future in self.pending_requests.values():
            if not future.done():
                future.cancel()
        self.pending_requests.clear()
        
        log_info("Disconnected from Deriv", user_id=self.user_id)

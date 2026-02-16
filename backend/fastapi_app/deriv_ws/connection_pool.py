"""
Professional connection pool for Deriv WebSocket clients.
Manages multiple user connections with automatic cleanup.
"""
from typing import Dict, Optional
import asyncio
from datetime import datetime, timedelta

from .client import DerivWebSocketClient
from fastapi_app.config import settings
from shared.utils.logger import log_info, log_error, log_warning, get_logger

logger = get_logger("deriv_pool")


class ConnectionPool:
    """
    Professional connection pool for Deriv WebSocket clients.
    
    Features:
    - One connection per user (isolated)
    - Automatic cleanup of idle connections
    - Connection reuse within same user
    - Graceful shutdown
    - Performance metrics
    """
    
    def __init__(self):
        self._clients: Dict[str, DerivWebSocketClient] = {}
        self._client_tokens: Dict[str, str] = {}
        self._last_used: Dict[str, datetime] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_interval = 300  # 5 minutes
        self._idle_timeout = 1800  # 30 minutes
    
    async def start(self):
        """Start background cleanup task."""
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("Connection pool started")
    
    async def stop(self):
        """Stop pool and close all connections."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None
        
        await self.close_all()
        logger.info("Connection pool stopped")
    
    async def get_or_create(
        self,
        user_id: int,
        api_token: str,
        connection_key: Optional[str] = None,
    ) -> Optional[DerivWebSocketClient]:
        """
        Get existing connection or create new one.
        
        Args:
            user_id: Nexus user ID
            api_token: Deriv API token
        
        Returns:
            DerivWebSocketClient or None if failed
        """
        key = connection_key or f"deriv_{user_id}"
        
        # Update last used time
        self._last_used[key] = datetime.utcnow()
        
        # Check for existing healthy connection
        if key in self._clients:
            client = self._clients[key]
            previous_token = self._client_tokens.get(key)
            if previous_token and previous_token != api_token:
                await self.close_key(key)
            elif client.status in ["connected", "authorized"]:
                return client
            else:
                # Remove unhealthy connection
                await self.close_key(key)
        
        # Create new connection
        try:
            client = DerivWebSocketClient(
                app_id=settings.DERIV_APP_ID,
                api_token=api_token,
                user_id=user_id,
            )
            
            if await client.connect():
                self._clients[key] = client
                self._client_tokens[key] = api_token
                log_info(f"Created new Deriv connection", user_id=user_id)
                return client
            else:
                log_error(f"Failed to connect Deriv client", user_id=user_id)
                return None
        
        except Exception as e:
            log_error(f"Connection creation failed", exception=e, user_id=user_id)
            return None
    
    async def close(self, user_id: int):
        """Close all connections for a specific user ID prefix."""
        prefix = f"deriv_{user_id}"
        keys = [k for k in self._clients.keys() if k.startswith(prefix)]
        for key in keys:
            await self.close_key(key)

    async def close_key(self, key: str):
        """Close one connection by exact pool key."""
        client = self._clients.get(key)
        if not client:
            return
        try:
            await client.disconnect()
        except Exception as e:
            log_error("Error disconnecting client", exception=e, key=key)
        finally:
            del self._clients[key]
            self._client_tokens.pop(key, None)
            self._last_used.pop(key, None)
            log_info("Closed Deriv connection", key=key)
    
    async def close_all(self):
        """Close all connections."""
        for key in list(self._clients.keys()):
            await self.close_key(key)
        self._clients.clear()
        self._client_tokens.clear()
        self._last_used.clear()
        logger.info("All Deriv connections closed")
    
    async def _cleanup_loop(self):
        """Periodically cleanup idle connections."""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                await self._cleanup_idle_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                log_error("Cleanup error", exception=e)
    
    async def _cleanup_idle_connections(self):
        """Remove connections that have been idle too long."""
        now = datetime.utcnow()
        idle_timeout = timedelta(seconds=self._idle_timeout)
        
        for key, last_used in list(self._last_used.items()):
            if now - last_used > idle_timeout:
                user_id = int(key.split("_")[1])
                log_info("Closing idle connection", user_id=user_id)
                await self.close(user_id)
    
    def get_active_connections(self) -> int:
        """Get number of active connections."""
        return len(self._clients)
    
    def get_connection_stats(self) -> Dict:
        """Get connection pool statistics."""
        return {
            "active_connections": len(self._clients),
            "idle_connections": len(self._clients) - len(self._last_used),
            "users": list(self._clients.keys()),
        }
    
    def broadcast(self, message: Dict):
        """
        Broadcast message to all connected frontend WebSocket clients.
        Non-blocking - schedules tasks for each connection.
        """
        try:
            # Import here to avoid circular imports
            from fastapi_app.main import app
            from starlette.websockets import WebSocketState
            
            connections = getattr(app.state, "ws_connections", {})
            
            for user_id, ws in connections.items():
                async def _send(websocket, msg):
                    try:
                        if getattr(websocket, "client_state", None) == WebSocketState.CONNECTED:
                            await websocket.send_json(msg)
                    except Exception as e:
                        log_error(f"Failed to send to user {user_id}", exception=e)
                
                asyncio.create_task(_send(ws, message))
            
            if connections:
                logger.debug(f"Broadcasted message to {len(connections)} clients")
        
        except Exception as e:
            log_error("Broadcast failed", exception=e)


# Global connection pool instance
pool = ConnectionPool()

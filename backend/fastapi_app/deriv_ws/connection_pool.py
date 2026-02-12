"""
Connection pool for managing Deriv WebSocket connections.
"""

from typing import TYPE_CHECKING, Optional
import asyncio

# Only import the client class for type checking to avoid circular import at runtime
if TYPE_CHECKING:
    from .client import DerivWebSocketClient  # pragma: no cover

from fastapi_app.config import settings
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("pool")


class ConnectionPool:
    """
    Manage multiple Deriv WebSocket connections.
    One connection per user or shared connection with multiplexing.
    """
    
    def __init__(self):
        """Initialize connection pool."""
        self._clients = {}
    
    async def get_or_create(
        self,
        user_id: int,
        api_token: str,
    ) -> Optional["DerivWebSocketClient"]:
        """
        Get existing connection or create new one.

        Args:
        - user_id: User ID (for connection key)
        - api_token: Deriv API token

        Returns:
        - DerivWebSocketClient or None if failed
        """
        key = f"user_{user_id}"

        # Check if connection exists and is alive
        if key in self._clients:
            client = self._clients[key]
            if getattr(client, "status", None) and client.status.value in ["connected", "authorized"]:
                return client
            else:
                # Remove dead connection
                del self._clients[key]

        # Local import to avoid circular import at module import time
        try:
            from .client import DerivWebSocketClient
        except Exception as e:
            log_error("Failed to import DerivWebSocketClient", exception=e)
            return None

        # Create new connection
        try:
            client = DerivWebSocketClient(settings.DERIV_APP_ID, api_token)

            if await client.connect():
                self._clients[key] = client
                log_info(f"Created new connection for user {user_id}")
                return client
            else:
                log_error(f"Failed to connect new client for user {user_id}")
                return None

        except Exception as e:
            log_error(f"Connection creation error for user {user_id}", exception=e)
            return None
    
    async def close(self, user_id: int):
        """
        Close connection for a user.

        Args:
        - user_id: User ID
        """
        key = f"user_{user_id}"
        
        if key in self._clients:
            client = self._clients[key]
            await client.disconnect()
            del self._clients[key]
    
    async def close_all(self):
        """Close all connections."""
        for client in self._clients.values():
            await client.disconnect()
        self._clients.clear()

    def broadcast(self, message):
        """
        Broadcast a message to all connected frontend WebSocket clients.

        This schedules non-blocking asyncio tasks to send JSON to each
        WebSocket stored in app.state.ws_connections (FastAPI/Starlette WebSocket).
        """
        try:
            # Import here to avoid circular imports at module import time
            from fastapi_app.main import app
            from starlette.websockets import WebSocketState

            connections = getattr(app.state, "ws_connections", {}) or {}

            for ws in list(connections.values()):
                async def _send(w):
                    try:
                        # Only send if still connected
                        if getattr(w, "client_state", None) == WebSocketState.CONNECTED:
                            await w.send_json(message)
                    except Exception as e:
                        log_error("Failed to send websocket message", exception=e)

                try:
                    asyncio.create_task(_send(ws))
                except Exception as e:
                    log_error("Failed to schedule websocket send", exception=e)

        except Exception as e:
            log_error("Broadcast failed", exception=e)

# Global connection pool
pool = ConnectionPool()

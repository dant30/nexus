"""
Connection pool for managing Deriv WebSocket connections.
"""

from typing import Dict, Optional
import asyncio

from .client import DerivWebSocketClient
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
        self.connections: Dict[str, DerivWebSocketClient] = {}
    
    async def get_or_create(
        self,
        user_id: int,
        api_token: str,
    ) -> Optional[DerivWebSocketClient]:
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
        if key in self.connections:
            client = self.connections[key]
            if client.status.value in ["connected", "authorized"]:
                return client
            else:
                # Remove dead connection
                del self.connections[key]
        
        # Create new connection
        try:
            client = DerivWebSocketClient(settings.DERIV_APP_ID, api_token)
            
            if await client.connect():
                self.connections[key] = client
                log_info(f"Created new connection for user {user_id}")
                return client
            else:
                log_error(f"Failed to create connection for user {user_id}")
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
        
        if key in self.connections:
            client = self.connections[key]
            await client.disconnect()
            del self.connections[key]
    
    async def close_all(self):
        """Close all connections."""
        for client in self.connections.values():
            await client.disconnect()
        self.connections.clear()


# Global connection pool
pool = ConnectionPool()

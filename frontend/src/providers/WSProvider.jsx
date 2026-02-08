/**
 * WebSocket Hook & Provider
 * Manages WebSocket connections for real-time updates
 */

import React, { createContext, useState, useCallback, useEffect } from "react";
import { wsManager } from "../ws/wsManager.js";
import { WS_ENDPOINTS } from "../constants/api.js";
import { useAuth } from "./AuthProvider.jsx";

export const WSContext = createContext(null);

export function WSProvider({ children }) {
  const { user } = useAuth();
  const [wsState, setWSState] = useState({
    connected: false,
    error: null,
  });

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!user) return;

    // Get user's default account (would need to fetch)
    const accountId = 1; // TODO: Get actual default account
    const wsUrl = WS_ENDPOINTS.TRADING(user.id, accountId);

    wsManager
      .connect(wsUrl)
      .then(() => {
        setWSState({ connected: true, error: null });
      })
      .catch((error) => {
        setWSState({ connected: false, error });
      });

    // Listen for connection changes
    const unsubscribe = wsManager.onConnectionChange((event) => {
      if (event.status === "connected") {
        setWSState({ connected: true, error: null });
      } else if (event.status === "disconnected") {
        setWSState({ connected: false, error: null });
      } else if (event.status === "error") {
        setWSState({ connected: false, error: event.error });
      }
    });

    return () => {
      unsubscribe();
      // Don't disconnect on unmount to keep connection alive for other components
    };
  }, [user]);

  const subscribeTick = useCallback((symbol) => {
    return wsManager.subscribeTicks(symbol);
  }, []);

  const unsubscribeTick = useCallback((symbol) => {
    return wsManager.unsubscribeTicks(symbol);
  }, []);

  const sendMessage = useCallback((type, data) => {
    return wsManager.send(type, data);
  }, []);

  const onMessage = useCallback((type, handler) => {
    return wsManager.on(type, handler);
  }, []);

  const value = {
    ...wsState,
    subscribeTick,
    unsubscribeTick,
    sendMessage,
    onMessage,
    getStats: () => wsManager.getStats(),
  };

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

/**
 * Hook to use WebSocket
 */
export function useWebSocket() {
  const context = React.useContext(WSContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WSProvider");
  }
  return context;
}

// frontend/src/providers/WSProvider.jsx
/**
 * WebSocket Hook & Provider
 * Manages WebSocket connections for real-time updates
 */

import React, { createContext, useState, useCallback, useEffect, useRef } from "react";
import { wsManager } from "../core/ws/wsManager.js";
import { WS_ENDPOINTS } from "../core/constants/api.js";
import { useAuth } from "../features/auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../features/accounts/contexts/AccountContext.jsx";

export const WSContext = createContext(null);

export function WSProvider({ children }) {
  const { user } = useAuth();
  const { activeAccount } = useAccountContext();
  const wsUrlRef = useRef(null);
  const [wsState, setWSState] = useState({
    connected: false,
    error: null,
  });

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!user || !activeAccount?.id) return;

    const wsUrl = WS_ENDPOINTS.TRADING(user.id, activeAccount.id);
    wsUrlRef.current = wsUrl;

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
      wsManager.disconnect();
    };
  }, [user, activeAccount?.id]);

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

  const reconnect = useCallback(async () => {
    if (!wsUrlRef.current) return;
    wsManager.disconnect();
    try {
      await wsManager.connect(wsUrlRef.current);
      setWSState({ connected: true, error: null });
    } catch (error) {
      setWSState({ connected: false, error });
    }
  }, []);

  const value = {
    ...wsState,
    subscribeTick,
    unsubscribeTick,
    sendMessage,
    onMessage,
    reconnect,
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

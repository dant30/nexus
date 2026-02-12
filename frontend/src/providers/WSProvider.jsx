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
    lastStatus: "disconnected",
    reconnectAttempts: 0,
    lastErrorAt: null,
  });

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!user || !activeAccount?.id) return;

    const wsUrl = WS_ENDPOINTS.TRADING(user.id, activeAccount.id);
    wsUrlRef.current = wsUrl;

    wsManager
      .connect(wsUrl)
      .then(() => {
        const stats = wsManager.getStats();
        setWSState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          lastStatus: "connected",
          reconnectAttempts: stats.reconnectAttempts,
        }));
      })
      .catch((error) => {
        const stats = wsManager.getStats();
        setWSState((prev) => ({
          ...prev,
          connected: false,
          error,
          lastStatus: "error",
          reconnectAttempts: stats.reconnectAttempts,
          lastErrorAt: Date.now(),
        }));
      });

    // Listen for connection changes
    const unsubscribe = wsManager.onConnectionChange((event) => {
      const stats = wsManager.getStats();
      if (event.status === "connected") {
        setWSState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          lastStatus: "connected",
          reconnectAttempts: stats.reconnectAttempts,
        }));
      } else if (event.status === "disconnected") {
        setWSState((prev) => ({
          ...prev,
          connected: false,
          error: null,
          lastStatus: "disconnected",
          reconnectAttempts: stats.reconnectAttempts,
        }));
      } else if (event.status === "error") {
        setWSState((prev) => ({
          ...prev,
          connected: false,
          error: event.error,
          lastStatus: "error",
          reconnectAttempts: stats.reconnectAttempts,
          lastErrorAt: Date.now(),
        }));
      }
    });

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [user, activeAccount?.id]);

  const subscribeTick = useCallback((symbol, options = {}) => {
    return wsManager.subscribeTicks(symbol, options);
  }, []);

  const unsubscribeTick = useCallback((symbol, options = {}) => {
    return wsManager.unsubscribeTicks(symbol, options);
  }, []);

  const sendMessage = useCallback((type, data) => {
    // Ensure connection is established before sending to avoid silent drops
    if (!wsUrlRef.current) {
      return false;
    }
    if (!wsManager.isConnected()) {
      // Try to reconnect synchronously (best-effort)
      try {
        // connect expects URL
        wsManager.connect(wsUrlRef.current).catch(() => {});
      } catch (e) {}
    }
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
      const stats = wsManager.getStats();
      setWSState((prev) => ({
        ...prev,
        connected: true,
        error: null,
        lastStatus: "connected",
        reconnectAttempts: stats.reconnectAttempts,
      }));
    } catch (error) {
      const stats = wsManager.getStats();
      setWSState((prev) => ({
        ...prev,
        connected: false,
        error,
        lastStatus: "error",
        reconnectAttempts: stats.reconnectAttempts,
        lastErrorAt: Date.now(),
      }));
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

// frontend/src/core/ws/wsManager.js
/**
 * WebSocket Manager
 * Manages real-time connections for trading updates
 */

import { WS_CONFIG } from "../constants/api.js";

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isIntentionallyClosed = false;
    this.messageHandlers = {};
    this.connectionListeners = [];
  }

  /**
   * Connect to WebSocket
   */
  async connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.isIntentionallyClosed = false;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log("[WebSocket] Connected:", url);
          this.reconnectAttempts = 0;
          this.emitConnectionEvent("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error);
          this.emitConnectionEvent("error", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[WebSocket] Disconnected");
          this.emitConnectionEvent("disconnected");

          // Auto-reconnect if not intentionally closed
          if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
          }
        };

        // Set heartbeat
        this.startHeartbeat();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Send message
   */
  send(type, data = {}) {
    if (!this.isConnected()) {
      console.warn("[WebSocket] Not connected, cannot send message");
      return false;
    }

    try {
      this.ws.send(
        JSON.stringify({
          type,
          timestamp: Date.now(),
          ...data,
        })
      );
      return true;
    } catch (error) {
      console.error("[WebSocket] Failed to send message:", error);
      return false;
    }
  }

  /**
   * Subscribe to message type
   */
  on(type, handler) {
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }
    this.messageHandlers[type].push(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers[type] = this.messageHandlers[type].filter((h) => h !== handler);
    };
  }

  /**
   * Subscribe to connection events
   */
  onConnectionChange(listener) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, data } = message;

    // Call registered handlers
    if (this.messageHandlers[type]) {
      this.messageHandlers[type].forEach((handler) => {
        try {
          handler(data, message);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${type}:`, error);
        }
      });
    }

    // Call wildcard handlers
    if (this.messageHandlers["*"]) {
      this.messageHandlers["*"].forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[WebSocket] Wildcard handler error:", error);
        }
      });
    }
  }

  /**
   * Emit connection event
   */
  emitConnectionEvent(status, error = null) {
    this.connectionListeners.forEach((listener) => {
      try {
        listener({ status, error });
      } catch (err) {
        console.error("[WebSocket] Connection listener error:", err);
      }
    });
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error("[WebSocket] Max reconnection attempts reached");
      this.emitConnectionEvent("failed");
      return;
    }

    this.reconnectAttempts++;
    const delay = WS_CONFIG.RECONNECT_INTERVAL * this.reconnectAttempts;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url).catch(() => {
        // Connection failed, will schedule retry on close
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected()) {
        this.send("ping");
      }
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Subscribe to market ticks
   */
  subscribeTicks(symbol, options = {}) {
    return this.send("subscribe", { type: "subscribe", symbol, ...options });
  }

  /**
   * Unsubscribe from ticks
   */
  unsubscribeTicks(symbol, options = {}) {
    return this.send("unsubscribe", { type: "unsubscribe", symbol, ...options });
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connected: this.isConnected(),
      url: this.url,
      reconnectAttempts: this.reconnectAttempts,
      messageHandlers: Object.keys(this.messageHandlers),
    };
  }
}

// Export singleton
export const wsManager = new WebSocketManager();

export default WebSocketManager;

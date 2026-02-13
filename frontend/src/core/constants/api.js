/**
 * API Configuration & Constants
 * Central place for all API endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000/ws";
export const API_TIMEOUT = 30000; // 30 seconds

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    ME: `${API_BASE_URL}/auth/me`,
    CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
    OAUTH_AUTHORIZE: `${API_BASE_URL}/oauth/deriv/authorize`,
    OAUTH_CALLBACK: `${API_BASE_URL}/oauth/deriv/callback`,
  },
  OAUTH: {
    DERIV_AUTHORIZE: `${API_BASE_URL}/oauth/deriv/authorize`,
    DERIV_CALLBACK: `${API_BASE_URL}/oauth/deriv/callback`,
  },

  // Users
  USERS: {
    PROFILE: `${API_BASE_URL}/users/profile`,
    AFFILIATE_CODE: `${API_BASE_URL}/users/affiliate/code`,
    AFFILIATE_STATS: `${API_BASE_URL}/users/affiliate/stats`,
  },

  // Accounts
  ACCOUNTS: {
    LIST: `${API_BASE_URL}/accounts/`,
    CREATE: `${API_BASE_URL}/accounts/demo`,
    GET: (id) => `${API_BASE_URL}/accounts/${id}`,
    SET_DEFAULT: (id) => `${API_BASE_URL}/accounts/${id}/default`,
    BALANCE: (id) => `${API_BASE_URL}/accounts/${id}/balance`,
    BALANCE_LIVE: (id) => `${API_BASE_URL}/accounts/${id}/balance/live`,
    DEFAULT: `${API_BASE_URL}/accounts/default`,
  },

  // Trades
  TRADES: {
    LIST: `${API_BASE_URL}/trades/`,
    OPEN: `${API_BASE_URL}/trades/open`,
    GET: (id) => `${API_BASE_URL}/trades/${id}`,
    CLOSE: (id) => `${API_BASE_URL}/trades/${id}/close`,
    PROFIT: (id) => `${API_BASE_URL}/trades/${id}/profit`,
    STATS: `${API_BASE_URL}/trades/stats`,
  },

  // Billing
  BILLING: {
    TRANSACTIONS: `${API_BASE_URL}/billing/transactions`,
    BALANCE: `${API_BASE_URL}/billing/balance`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications/`,
    MARK_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
  },
};

// WebSocket URLs
export const WS_ENDPOINTS = {
  TRADING: (userId, accountId) => `${WS_BASE_URL}/trading/${userId}/${accountId}`,
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Default request headers
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  RETRY_STATUS_CODES: [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.INTERNAL_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
  ],
};

// WebSocket reconnection config
export const WS_CONFIG = {
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
};

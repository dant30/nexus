/**
 * HTTP Client with JWT Authentication & Token Refresh
 * Handles all API requests with automatic token refresh.
 */

import { API_ENDPOINTS, HTTP_STATUS, DEFAULT_HEADERS, RETRY_CONFIG } from "../constants/api.js";
import AuthStorage from "../storage/auth.js";

class APIClient {
  constructor() {
    this.baseURL = this._resolveBaseURL();
    this.defaultHeaders = { ...DEFAULT_HEADERS };
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.tokenExpiryTimer = null;
  }

  _resolveBaseURL() {
    try {
      const parsed = new URL(API_ENDPOINTS.AUTH.LOGIN);
      return parsed.origin;
    } catch {
      return "";
    }
  }

  _resolveURL(url) {
    if (!url) return this.baseURL;
    if (/^https?:\/\//i.test(url)) return url;
    if (!this.baseURL) return url;
    return `${this.baseURL}${url}`;
  }

  _redirectToLogin() {
    if (typeof window === "undefined") return;
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  _decodeTokenPayload(token) {
    try {
      const parts = token?.split(".") || [];
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  isTokenExpired(token, bufferSeconds = 30) {
    if (!token) return true;
    const payload = this._decodeTokenPayload(token);
    if (!payload?.exp) return true;
    const now = Date.now();
    return now + bufferSeconds * 1000 >= payload.exp * 1000;
  }

  addRequestInterceptor(callback) {
    this.interceptors.request.push(callback);
  }

  addResponseInterceptor(callback) {
    this.interceptors.response.push(callback);
  }

  addErrorInterceptor(callback) {
    this.interceptors.error.push(callback);
  }

  onRefreshed(callback) {
    this.refreshSubscribers.push(callback);
  }

  notifyRefreshed(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  scheduleTokenRefresh(token) {
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }

    const payload = this._decodeTokenPayload(token);
    if (!payload?.exp) return;

    const now = Date.now();
    const expiry = payload.exp * 1000;
    const msUntilExpiry = expiry - now;
    if (msUntilExpiry <= 0) return;

    // Refresh 60 seconds before expiry.
    const refreshIn = Math.max(msUntilExpiry - 60000, 1000);
    this.tokenExpiryTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshIn);
  }

  async refreshAccessToken() {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      AuthStorage.clear();
      this._redirectToLogin();
      return null;
    }

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.onRefreshed((token) => resolve(token));
      });
    }

    this.isRefreshing = true;
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await this._parseResponseBody(response);
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Token refresh failed");
      }

      const newAccessToken = data?.access_token;
      const newRefreshToken = data?.refresh_token || refreshToken;
      if (!newAccessToken) {
        throw new Error("Refresh response missing access_token");
      }

      AuthStorage.setTokens(newAccessToken, newRefreshToken);
      this.notifyRefreshed(newAccessToken);
      this.scheduleTokenRefresh(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      AuthStorage.clear();
      this.notifyRefreshed(null);
      this._redirectToLogin();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  async request(url, options = {}) {
    const fullUrl = this._resolveURL(url);
    const config = {
      method: options.method || "GET",
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
      ...options,
    };

    // Remove JSON content-type when sending FormData
    if (config.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Pre-emptive refresh
    let token = AuthStorage.getAccessToken();
    if (token && this.isTokenExpired(token, 30)) {
      token = await this.refreshAccessToken();
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    for (const interceptor of this.interceptors.request) {
      await interceptor(config);
    }

    let lastError = null;
    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(fullUrl, config);

        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          const newToken = await this.refreshAccessToken();
          if (!newToken) {
            const authError = new Error("Authentication failed");
            authError.status = HTTP_STATUS.UNAUTHORIZED;
            throw authError;
          }

          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };
          const retryResponse = await fetch(fullUrl, retryConfig);
          return this.handleResponse(retryResponse);
        }

        return this.handleResponse(response);
      } catch (error) {
        lastError = error;
        const status = error?.status;
        const isRetryableStatus = RETRY_CONFIG.RETRY_STATUS_CODES.includes(status);
        const isNetworkError = typeof status !== "number";
        const canRetry = attempt < RETRY_CONFIG.MAX_RETRIES && (isRetryableStatus || isNetworkError);

        if (canRetry) {
          const delayMs = RETRY_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
          await this.delay(delayMs);
          continue;
        }

        for (const interceptor of this.interceptors.error) {
          await interceptor(error);
        }

        throw error;
      }
    }

    throw lastError;
  }

  async _parseResponseBody(response) {
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch {
      return null;
    }
  }

  async handleResponse(response) {
    const data = await this._parseResponseBody(response);
    const result = {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers,
    };

    for (const interceptor of this.interceptors.response) {
      await interceptor(result);
    }

    if (!response.ok) {
      const error = new Error(
        data?.detail || data?.message || data?.error?.message || "API request failed"
      );
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  }

  get(url, options = {}) {
    return this.request(url, { ...options, method: "GET" });
  }

  post(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: "DELETE" });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new APIClient();

const existingToken = AuthStorage.getAccessToken();
if (existingToken && !AuthStorage.isTokenExpired(existingToken)) {
  apiClient.scheduleTokenRefresh(existingToken);
}

export default APIClient;

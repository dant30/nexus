// fronted/src/core/api/client.js
/**
 * HTTP Client with JWT Authentication & Token Refresh
 * Handles all API requests with automatic token refresh
 */

import { API_ENDPOINTS, HTTP_STATUS, DEFAULT_HEADERS, RETRY_CONFIG } from "../constants/api.js";
import AuthStorage from "../storage/auth.js";

class APIClient {
  constructor() {
    this.baseURL = API_ENDPOINTS.AUTH.LOGIN.replace("/auth/login", "");
    this.defaultHeaders = DEFAULT_HEADERS;
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(callback) {
    this.interceptors.request.push(callback);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(callback) {
    this.interceptors.response.push(callback);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(callback) {
    this.interceptors.error.push(callback);
  }

  /**
   * Subscribe to token refresh
   */
  onRefreshed(callback) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify all subscribers of token refresh
   */
  notifyRefreshed(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    const refreshToken = AuthStorage.getRefreshToken();

    if (!refreshToken) {
      AuthStorage.clear();
      window.location.href = "/login";
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: "POST",
        headers: this.defaultHeaders,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      const newAccessToken = data.access_token;

      // Save new token
      AuthStorage.setTokens(newAccessToken, data.refresh_token || refreshToken);

      this.notifyRefreshed(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Token refresh error:", error);
      AuthStorage.clear();
      window.location.href = "/login";
      return null;
    }
  }

  /**
   * Make HTTP request
   */
  async request(url, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // Add Authorization header if token exists
    const token = AuthStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Run request interceptors
    for (const interceptor of this.interceptors.request) {
      await interceptor(config);
    }

    // Retry logic
    let lastError;
    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, config);

        // Handle token expiration
        if (response.status === HTTP_STATUS.UNAUTHORIZED) {
          // Try to refresh token
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            const newToken = await this.refreshAccessToken();
            this.isRefreshing = false;

            if (newToken) {
              // Retry request with new token
              config.headers.Authorization = `Bearer ${newToken}`;
              const retryResponse = await fetch(url, config);
              return this.handleResponse(retryResponse);
            }
          }
        }

        return this.handleResponse(response);
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (
          attempt < RETRY_CONFIG.MAX_RETRIES &&
          RETRY_CONFIG.RETRY_STATUS_CODES.includes(error.status)
        ) {
          await this.delay(RETRY_CONFIG.RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }

        // Run error interceptors
        for (const interceptor of this.interceptors.error) {
          await interceptor(error);
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Handle response
   */
  async handleResponse(response) {
    let data = null;

    // Try to parse JSON
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      console.warn("Failed to parse response body:", error);
    }

    const result = {
      status: response.status,
      ok: response.ok,
      data: data,
      headers: response.headers,
    };

    // Run response interceptors
    for (const interceptor of this.interceptors.response) {
      await interceptor(result);
    }

    if (!response.ok) {
      const error = new Error(data?.error?.message || "API request failed");
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  }

  /**
   * GET request
   */
  get(url, options = {}) {
    return this.request(url, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  post(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  put(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   */
  patch(url, body = {}, options = {}) {
    return this.request(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  delete(url, options = {}) {
    return this.request(url, { ...options, method: "DELETE" });
  }

  /**
   * Delay helper for retries
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apiClient = new APIClient();

export default APIClient;

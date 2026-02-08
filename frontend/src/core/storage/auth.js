/**
 * Authentication Storage
 * Manages JWT tokens and user session in localStorage
 */

const TOKEN_PREFIX = "nexus_";
const ACCESS_TOKEN_KEY = `${TOKEN_PREFIX}access_token`;
const REFRESH_TOKEN_KEY = `${TOKEN_PREFIX}refresh_token`;
const USER_KEY = `${TOKEN_PREFIX}user`;
const DERIV_SESSION_KEY = `${TOKEN_PREFIX}deriv_session`;

class AuthStorage {
  /**
   * Save tokens and user data
   */
  static setTokens(accessToken, refreshToken, user = null) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } catch (error) {
      console.error("Failed to save tokens:", error);
    }
  }

  /**
   * Get access token
   */
  static getAccessToken() {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  static getRefreshToken() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get refresh token:", error);
      return null;
    }
  }

  /**
   * Get saved user data
   */
  static getUser() {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Failed to get user:", error);
      return null;
    }
  }

  /**
   * Update user data
   */
  static setUser(user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  }

  /**
   * Clear all authentication data
   */
  static clear() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(DERIV_SESSION_KEY);
    } catch (error) {
      console.error("Failed to clear auth storage:", error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated() {
    return !!this.getAccessToken();
  }

  /**
   * Save Deriv OAuth session info
   */
  static setDerivSession(sessionData) {
    try {
      localStorage.setItem(DERIV_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Failed to save Deriv session:", error);
    }
  }

  /**
   * Get Deriv OAuth session info
   */
  static getDerivSession() {
    try {
      const session = localStorage.getItem(DERIV_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error("Failed to get Deriv session:", error);
      return null;
    }
  }

  /**
   * Clear Deriv session
   */
  static clearDerivSession() {
    try {
      localStorage.removeItem(DERIV_SESSION_KEY);
    } catch (error) {
      console.error("Failed to clear Deriv session:", error);
    }
  }

  /**
   * Check if token is expired (basic check using JWT)
   */
  static isTokenExpired(token) {
    try {
      if (!token) return true;

      // Decode JWT (without verification, just to get exp)
      const parts = token.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const expTime = payload.exp * 1000; // Convert to milliseconds

      return Date.now() >= expTime;
    } catch (error) {
      console.error("Failed to check token expiry:", error);
      return true;
    }
  }
}

export default AuthStorage;

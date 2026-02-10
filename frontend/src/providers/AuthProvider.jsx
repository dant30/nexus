// frontend/src/provider/AuthProvider.jsx
/**
 * Auth Provider Context
 * Manages authentication state and provides auth methods
 */

import React, { createContext, useState, useCallback, useEffect } from "react";
import { apiClient } from "../core/api/client.js";
import { API_ENDPOINTS } from "../constants/api.js";
import AuthStorage from "../storage/auth.js";
import { handleAPIError } from "../api/errorHandler.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    user: AuthStorage.getUser(),
    isAuthenticated: AuthStorage.isAuthenticated(),
    loading: true,
  });

  // Initialize auth on mount
  useEffect(() => {
    const token = AuthStorage.getAccessToken();
    if (token && !AuthStorage.isTokenExpired(token)) {
      setAuth((prev) => ({
        ...prev,
        loading: false,
      }));
    } else {
      setAuth((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, []);

  /**
   * Login with username and password
   */
  const login = useCallback(async (username, password) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        username,
        password,
      });

      const { access_token, refresh_token, user } = response;

      // Save tokens and user
      AuthStorage.setTokens(access_token, refresh_token, user);

      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
      });

      return { success: true, user };
    } catch (error) {
      const apiError = handleAPIError(error);
      return { success: false, error: apiError };
    }
  }, []);

  /**
   * Sign up with email and password
   */
  const signup = useCallback(async (username, email, password, referredBy = null) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP, {
        username,
        email,
        password,
        referred_by: referredBy,
      });

      const { access_token, refresh_token, user } = response;

      // Save tokens and user
      AuthStorage.setTokens(access_token, refresh_token, user);

      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
      });

      return { success: true, user };
    } catch (error) {
      const apiError = handleAPIError(error);
      return { success: false, error: apiError };
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint (optional)
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear local data
    AuthStorage.clear();

    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false,
    });

    return { success: true };
  }, []);

  /**
   * Get authorization URL for Deriv OAuth
   */
  const getDerivAuthUrl = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.OAUTH_AUTHORIZE);
      return { success: true, url: response.authorization_url };
    } catch (error) {
      const apiError = handleAPIError(error);
      return { success: false, error: apiError };
    }
  }, []);

  /**
   * Handle Deriv OAuth callback
   */
  const handleDerivCallback = useCallback(async (code, state = "nexus") => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.OAUTH_CALLBACK, {
        code,
        state,
      });

      const { access_token, refresh_token, user } = response;

      // Save tokens and user
      AuthStorage.setTokens(access_token, refresh_token, user);

      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
      });

      return { success: true, user };
    } catch (error) {
      const apiError = handleAPIError(error);
      return { success: false, error: apiError };
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (updates) => {
      try {
        const response = await apiClient.patch(API_ENDPOINTS.USERS.PROFILE, updates);

        const updatedUser = response.user || { ...auth.user, ...updates };

        AuthStorage.setUser(updatedUser);

        setAuth((prev) => ({
          ...prev,
          user: updatedUser,
        }));

        return { success: true, user: updatedUser };
      } catch (error) {
        const apiError = handleAPIError(error);
        return { success: false, error: apiError };
      }
    },
    [auth.user]
  );

  const value = {
    ...auth,
    login,
    signup,
    logout,
    getDerivAuthUrl,
    handleDerivCallback,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

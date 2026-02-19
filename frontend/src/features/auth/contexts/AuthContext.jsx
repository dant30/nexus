import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import AuthStorage from "../../../core/storage/auth.js";
import {
  getOAuthUrl,
  handleOAuthCallback,
  loginRequest,
  logoutRequest,
  refreshRequest,
  fetchMeRequest,
} from "../services/authService.js";

const AuthContext = createContext(null);

const resolveStoredAuth = () => {
  const token = AuthStorage.getAccessToken();
  const user = AuthStorage.getUser();
  const isAuthenticated = !!token && !AuthStorage.isTokenExpired(token);

  if (!isAuthenticated) {
    AuthStorage.clear();
  }

  return {
    user: isAuthenticated ? user : null,
    isAuthenticated,
  };
};

const applyAuthResponse = (data, setState) => {
  if (!data) return;

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const incomingUser = data.user || data.account || null;
  const storedUser = AuthStorage.getUser();
  const user = incomingUser
    ? {
        ...(storedUser || {}),
        ...incomingUser,
      }
    : storedUser;

  if (accessToken) {
    AuthStorage.setTokens(accessToken, refreshToken, user);
  }

  if (user) {
    AuthStorage.setUser(user);
  }

  setState({
    user: user || AuthStorage.getUser(),
    isAuthenticated: true,
    loading: false,
    error: null,
  });
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const init = async () => {
      const stored = resolveStoredAuth();

      if (!stored.isAuthenticated) {
        setState((prev) => ({
          ...prev,
          ...stored,
          loading: false,
        }));
        return;
      }

      if (!stored.user) {
        try {
          const me = await fetchMeRequest();
          AuthStorage.setUser(me.user || me);
          setState({
            user: me.user || me,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return;
        } catch (error) {
          AuthStorage.clear();
        }
      }

      setState((prev) => ({
        ...prev,
        ...stored,
        loading: false,
      }));
    };

    init();
  }, []);

  const login = useCallback(async (credentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loginRequest(credentials);
      applyAuthResponse(data, setState);
      return { ok: true, data };
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error }));
      return { ok: false, error };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      // Ignore logout API errors
    } finally {
      AuthStorage.clear();
      setState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      await logout();
      return { ok: false };
    }

    try {
      const data = await refreshRequest({ refresh_token: refreshToken });
      applyAuthResponse(data, setState);
      return { ok: true, data };
    } catch (error) {
      await logout();
      return { ok: false, error };
    }
  }, [logout]);

  const beginOAuth = useCallback(async () => {
    try {
      const data = await getOAuthUrl();
      const url = data.authorization_url || data.url;
      return { ok: true, url };
    } catch (error) {
      return { ok: false, error };
    }
  }, []);

  const completeOAuth = useCallback(async (payload) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await handleOAuthCallback(payload);
      applyAuthResponse(data, setState);
      return { ok: true, data };
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error }));
      return { ok: false, error };
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshSession,
      beginOAuth,
      completeOAuth,
    }),
    [state, login, logout, refreshSession, beginOAuth, completeOAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export { AuthContext };

import { useEffect, useMemo, useState } from "react";
import AuthStorage from "../../../core/storage/auth.js";
import { useAuth } from "../contexts/AuthContext.jsx";

const WARNING_WINDOW_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 30 * 1000;

const getTokenExpiry = (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch (error) {
    return null;
  }
};

export const useSession = () => {
  const { isAuthenticated } = useAuth();
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setExpiresAt(null);
      return;
    }

    const updateExpiry = () => {
      const token = AuthStorage.getAccessToken();
      setExpiresAt(getTokenExpiry(token));
    };

    updateExpiry();
    const interval = setInterval(updateExpiry, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const session = useMemo(() => {
    if (!expiresAt) {
      return { expiresAt: null, secondsLeft: null, shouldWarn: false };
    }

    const remaining = Math.max(expiresAt - Date.now(), 0);
    return {
      expiresAt,
      secondsLeft: Math.ceil(remaining / 1000),
      shouldWarn: remaining > 0 && remaining <= WARNING_WINDOW_MS,
    };
  }, [expiresAt]);

  return session;
};
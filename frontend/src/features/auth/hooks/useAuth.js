import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export const useAuthActions = () => {
  const { login, logout, refreshSession, completeOAuth } = useAuth();

  const signIn = useCallback(
    async (emailOrUsername, password) => {
      return login({ username: emailOrUsername, password });
    },
    [login]
  );

  const signOut = useCallback(async () => {
    return logout();
  }, [logout]);

  const refresh = useCallback(async () => {
    return refreshSession();
  }, [refreshSession]);

  const finishOAuth = useCallback(
    async (payload) => {
      return completeOAuth(payload);
    },
    [completeOAuth]
  );

  return { signIn, signOut, refresh, finishOAuth };
};
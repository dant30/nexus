import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export const useOAuth = () => {
  const { beginOAuth } = useAuth();

  const startOAuth = useCallback(async () => {
    const result = await beginOAuth();
    if (result.ok && result.url) {
      window.location.assign(result.url);
    }
    return result;
  }, [beginOAuth]);

  return { startOAuth };
};
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export const useSession = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    // Placeholder for session expiry logic
  }, [isAuthenticated]);
};

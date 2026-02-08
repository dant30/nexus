import React, { createContext, useContext, useEffect, useState } from "react";
import { authStorage } from "../../../core/storage/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = authStorage.get();
    if (saved?.user) {
      setUser(saved.user);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (payload) => {
    authStorage.set(payload);
    setUser(payload.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

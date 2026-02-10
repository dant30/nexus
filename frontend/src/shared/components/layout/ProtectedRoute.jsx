import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";

/**
 * ProtectedRoute - Guards routes behind authentication
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
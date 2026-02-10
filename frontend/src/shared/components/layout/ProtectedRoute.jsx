import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-white flex items-center justify-center">
        <span className="text-sm text-white/60">Checking session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
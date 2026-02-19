import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";
import { allowIfRole } from "../../../router/routeGuards.js";

export function RoleRoute({ roles = [], children }) {
  const { user } = useAuth();

  if (!allowIfRole(user, roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

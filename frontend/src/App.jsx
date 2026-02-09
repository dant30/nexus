import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/contexts/AuthContext.jsx";
import { AppLayout } from "./shared/components/layout/AppLayout.jsx";
import { ProtectedRoute } from "./shared/components/layout/ProtectedRoute.jsx";
import { publicRoutes, protectedRoutes } from "./router/routes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {protectedRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
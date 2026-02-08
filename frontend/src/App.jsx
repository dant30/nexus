/**
 * Main App Component with Routing
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { RootProvider } from "./providers/RootProvider.jsx";
import { useAuth } from "./providers/AuthProvider.jsx";

// Pages
import { LoginPage } from "./pages/LoginPage.jsx";
import { OAuthConnectPage } from "./pages/OAuthConnectPage.jsx";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { TradingPage } from "./pages/TradingPage.jsx";

/**
 * Protected Route Component
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * App Component
 */
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading authentication...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route path="/oauth/connect" element={<OAuthConnectPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trade"
        element={
          <ProtectedRoute>
            <TradingPage />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">404</h1>
              <p className="text-slate-400 mb-8">Page not found</p>
              <a
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
              >
                Go Home
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <Router>
      <RootProvider>
        <AppContent />
      </RootProvider>
    </Router>
  );
}

export default App;

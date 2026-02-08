/**
 * Deriv OAuth Connect Page
 * Initiates the Deriv OAuth flow by redirecting to Deriv authorization URL
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";

export function OAuthConnectPage() {
  const navigate = useNavigate();
  const { getDerivAuthUrl, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initiateOAuth = async () => {
      try {
        // If already authenticated, redirect to dashboard
        if (isAuthenticated) {
          navigate("/dashboard");
          return;
        }

        // Get Deriv OAuth authorization URL
        const result = await getDerivAuthUrl();

        if (result.success && result.url) {
          // Redirect to Deriv authorization page
          window.location.href = result.url;
        } else {
          setError(result.error || "Failed to initiate OAuth flow");
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || "An error occurred");
        setLoading(false);
      }
    };

    initiateOAuth();
  }, [getDerivAuthUrl, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {loading && !error && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Connecting to Deriv...
            </h2>
            <p className="text-slate-400">
              Please wait while we redirect you to Deriv for authorization
            </p>
          </div>
        )}

        {error && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Connection Failed
            </h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition"
              >
                Back to Login
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

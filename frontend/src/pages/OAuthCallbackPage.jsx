/**
 * Deriv OAuth Callback Page
 * Handles redirect from Deriv after user authorizes
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleDerivCallback } = useAuth();
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
          setStatus("error");
          setError("No authorization code received from Deriv");
          return;
        }

        setStatus("exchanging");
        const result = await handleDerivCallback(code, state || "nexus");

        if (result.success) {
          setStatus("success");
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          setStatus("error");
          setError(result.error || "Failed to link Deriv account");
        }
      } catch (err) {
        setStatus("error");
        setError(err.message || "An error occurred during OAuth");
      }
    };

    processCallback();
  }, [searchParams, handleDerivCallback, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Processing State */}
        {status === "processing" && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Authorizing...
            </h2>
            <p className="text-slate-400">
              Please wait while we process your Deriv authorization
            </p>
          </div>
        )}

        {/* Exchanging State */}
        {status === "exchanging" && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Setting Up Account...
            </h2>
            <p className="text-slate-400">
              Linking your Deriv account and creating your Nexus profile
            </p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Success!
            </h2>
            <p className="text-slate-400 mb-6">
              Your Deriv account has been linked successfully
            </p>
            <p className="text-slate-500 text-sm">
              Redirecting to dashboard in a few seconds...
            </p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
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
              Authorization Failed
            </h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

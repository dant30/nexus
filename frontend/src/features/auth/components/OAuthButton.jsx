import React, { useState } from "react";
import { useOAuth } from "../hooks/useOAuth.js";

export function OAuthButton() {
  const { startOAuth } = useOAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onClick = async () => {
    try {
      setLoading(true);
      setError(null);
      await startOAuth();
    } catch (err) {
      setError(err.message || "Failed to connect. Please try again.");
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={loading || error !== null}
        aria-busy={loading}
        aria-label="Connect Deriv account"
        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-emerald-500/50 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-20" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              {/* Deriv-inspired icon */}
              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
              <span>Connect Deriv</span>
            </>
          )}
        </div>
      </button>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-in fade-in-up">
          <div className="flex items-start gap-3">
            <svg
              className="h-4 w-4 mt-0.5 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-white/50 text-center">
        Your Deriv account credentials are never stored
      </p>
    </div>
  );
}
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";
import { useAuthActions } from "../../../features/auth/hooks/useAuth.js";

export function Navbar({ onMenuClick }) {
  const { user, isAuthenticated } = useAuth();
  const { signOut } = useAuthActions();

  const displayName =
    user?.deriv_full_name?.trim() ||
    user?.first_name ||
    user?.username ||
    "Trader";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="sm:hidden rounded-lg border border-white/10 p-2 text-white/70 hover:text-white"
          >
            ☰
          </button>

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              Nexus
            </p>
            <Link to="/dashboard" className="text-lg font-semibold">
              Trading Console
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline rounded-full border border-white/10 px-3 py-1 text-white/70">
                {displayName}
              </span>
              <button
                onClick={signOut}
                className="rounded-full border border-white/10 px-4 py-2 text-white/80 transition hover:border-white/30"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-white/80 transition hover:border-white/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

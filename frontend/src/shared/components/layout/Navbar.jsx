import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";
import { useAuthActions } from "../../../features/auth/hooks/useAuth.js";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { signOut } = useAuthActions();
  const { accountType } = useBalance();
  const accountLabel = accountType?.toString().includes("virtual")
    ? "Virtual"
    : accountType
    ? accountType
    : user?.deriv_is_virtual === true
    ? "Virtual"
    : user?.deriv_is_virtual === false
    ? "Real"
    : user?.deriv_account_type
    ? user.deriv_account_type
    : "Virtual";

  return (
    <header className="border-b border-white/10 bg-slate/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Nexus</p>
          <Link to="/dashboard" className="text-lg font-semibold">
            Trading Console
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {isAuthenticated ? (
            <>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                {user?.username || user?.email || "Trader"}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                {accountLabel}
              </span>
              <button
                onClick={signOut}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition hover:border-white/30"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition hover:border-white/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

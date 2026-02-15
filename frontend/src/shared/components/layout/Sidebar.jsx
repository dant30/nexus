import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

import { navigationRoutes } from "../../../router/routes.jsx";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";
import { useAccountContext } from "../../../features/accounts/contexts/AccountContext.jsx";

const getLinkClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-accent/15 text-accent border-l-2 border-accent shadow-sm"
      : "text-white/70 border-l-2 border-transparent hover:bg-white/5 hover:text-white hover:border-white/20",
  ].join(" ");

export function Sidebar({ open, onClose }) {
  const { balance, currency, accountType, accountId, loading, status } =
    useBalance();
  const { accounts, activeAccount, switchAccount, switching } =
    useAccountContext() || {};

  const accountLabel = accountType || "Account";
  const balanceLabel =
    balance === null || balance === undefined
      ? "—"
      : `${balance} ${currency || ""}`.trim();
  const subLabel =
    status === "unavailable"
      ? "Service unavailable"
      : status === "empty"
      ? "No account linked"
      : loading
      ? "Updating..."
      : "Live";

  const statusColor =
    status === "unavailable"
      ? "text-danger"
      : status === "empty"
      ? "text-warn"
      : loading
      ? "text-white/40"
      : "text-accent";

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-72 sm:sticky sm:top-16 sm:h-[calc(100vh-4rem)] sm:z-30
          rounded-none sm:rounded-2xl border-r sm:border border-white/10 bg-slate/95 sm:bg-slate/70 backdrop-blur-sm
          transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header with Close Button - Mobile Only */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 px-4 py-4 sm:hidden bg-slate/98">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Menu</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 p-2 text-white/70 transition-all hover:border-white/30 hover:text-white hover:bg-white/5"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
            <p className="px-4 py-3 text-xs uppercase tracking-wider text-white/40">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigationRoutes.map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  className={getLinkClass}
                  end
                  onClick={onClose}
                >
                  <span>{route.label}</span>
                  <span className="text-xs text-white/40">{route.meta}</span>
                </NavLink>
              ))}
            </nav>

            {/* Mobile account switcher */}
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:hidden">
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                Switch Account
              </p>
              <div className="mt-2 space-y-1">
                {(accounts || []).map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    disabled={switching}
                    onClick={() => switchAccount?.(account.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                      activeAccount?.id === account.id
                        ? "bg-accent/15 text-accent"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    } ${switching ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="truncate">{account.deriv_account_id || account.id}</span>
                    <span className="ml-2 text-white/45">{account.account_type}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom-pinned balance card */}
          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-accent/10 to-accent/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-white/50">
                Account Balance
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{balanceLabel}</p>
                  <p className={`mt-2 text-xs font-medium ${statusColor}`}>{subLabel}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-xs text-white/50">Type</p>
                    <p className="text-sm font-semibold text-white">{accountLabel}</p>
                  </div>
                  {accountId && (
                    <div className="text-right">
                      <p className="text-xs text-white/50">Account</p>
                      <p className="text-sm font-semibold text-white">#{accountId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

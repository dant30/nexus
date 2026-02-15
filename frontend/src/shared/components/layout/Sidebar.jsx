import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

import { navigationRoutes } from "../../../router/routes.jsx";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";

const getLinkClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-accent/15 text-accent shadow-sm"
      : "text-white/70 hover:bg-white/5 hover:text-white",
  ].join(" ");

export function Sidebar({ open, onClose }) {
  const { balance, currency, accountType, loading, status } = useBalance();

  const accountLabel = accountType || "Account";
  const balanceLabel =
    balance === null || balance === undefined ? "—" : `${balance} ${currency || ""}`.trim();

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:sticky sm:top-16 sm:h-[calc(100vh-4rem)]
          border-r border-white/10 bg-slate/95 backdrop-blur-sm
          transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header with Close Button - Mobile Only */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 px-4 py-4 sm:hidden bg-slate/98">
            <p className="text-xs uppercase tracking-wider text-white/50">Menu</p>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 p-2 text-white/70 transition-all hover:border-white/30 hover:text-white hover:bg-white/5"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <p className="px-4 py-3 text-xs uppercase tracking-wider text-white/40">Workspace</p>

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
          </div>

          {/* Balance Card - Pinned Bottom */}
          <div className="border-t border-white/10 p-4">
            <div className="rounded-lg border border-white/10 bg-gradient-to-br from-accent/10 to-accent/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-white/50">Account Balance</p>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-2xl font-bold text-white">{balanceLabel}</p>
                  <p className={`mt-1 text-xs font-medium ${statusColor}`}>{subLabel}</p>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50">Type</p>
                  <p className="text-sm font-semibold text-white">{accountLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
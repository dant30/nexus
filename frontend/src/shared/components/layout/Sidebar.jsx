import React from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { navigationRoutes } from "../../../router/routes.jsx";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";

const getLinkClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
    isActive
      ? "border-accent/40 bg-accent/10 text-accent-muted"
      : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
  ].join(" ");

export function Sidebar({ open, onClose }) {
  const { balance, currency, accountType, accountId, loading, status } =
    useBalance();

  const accountLabel = accountType || "Account";
  const balanceLabel =
    balance === null || balance === undefined
      ? "—"
      : `${balance} ${currency || ""}`.trim();
  const subLabel =
    status === "unavailable"
      ? "Account service unavailable"
      : status === "empty"
      ? "No account linked"
      : loading
      ? "Updating..."
      : "Live";

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 h-full w-72 sm:sticky sm:top-24 sm:z-auto sm:h-fit sm:w-64 sm:self-start",
          "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between sm:hidden">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Workspace
          </p>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/30 hover:text-white"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:mt-0">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Balance
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold">{balanceLabel}</p>
              <p className="mt-1 text-xs text-white/50">{subLabel}</p>
              {accountId && (
                <p className="mt-1 text-xs text-white/40">
                  Account {accountId}
                </p>
              )}
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              {accountLabel}
            </span>
          </div>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/50">
          Workspace
        </p>

        <nav className="mt-4 space-y-2">
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
      </aside>
    </>
  );
}

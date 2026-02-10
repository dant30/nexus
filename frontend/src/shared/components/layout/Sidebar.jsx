import React from "react";
import { NavLink } from "react-router-dom";
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
  const { balance, currency, accountType, accountId, loading } = useBalance();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
        />
      )}

      <aside
        className={[
          "fixed z-50 h-full w-72 sm:static sm:z-auto sm:h-auto sm:w-64",
          "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
        ].join(" ")}
      >
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Balance
          </p>
          <p className="mt-3 text-2xl font-semibold">
            {balance ?? "—"} {currency}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {loading ? "Updating…" : "Live"}
          </p>
          {accountId && (
            <p className="mt-1 text-xs text-white/40">
              Account {accountId}
            </p>
          )}
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
              <span className="text-xs text-white/40">
                {route.meta}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

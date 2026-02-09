import React from "react";
import { NavLink } from "react-router-dom";
import { navigationRoutes } from "../../../router/routes.jsx";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";

const getLinkClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
    isActive
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
  ].join(" ");

export function Sidebar() {
  const { balance, currency, accountType, accountId, loading, status } = useBalance();
  const accountLabel = accountType || "Account";
  const balanceLabel =
    balance === null || balance === undefined ? "—" : `${balance} ${currency || ""}`.trim();
  const subLabel =
    status === "unavailable"
      ? "Account service unavailable"
      : status === "empty"
      ? "No account linked"
      : loading
      ? "Updating..."
      : "Live";

  return (
    <aside className="w-64 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Balance</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold">{balanceLabel}</p>
            <p className="mt-1 text-xs text-white/50">{subLabel}</p>
            {accountId && (
              <p className="mt-1 text-xs text-white/40">Account {accountId}</p>
            )}
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
            {accountLabel}
          </span>
        </div>
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/50">Workspace</p>
      <nav className="mt-4 space-y-2">
        {navigationRoutes.map((route) => (
          <NavLink key={route.path} to={route.path} className={getLinkClass} end>
            <span>{route.label}</span>
            <span className="text-xs text-white/40">{route.meta}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

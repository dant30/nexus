import React from "react";
import { NavLink } from "react-router-dom";
import { navigationRoutes } from "../../../router/routes.jsx";

const getLinkClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
    isActive
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
  ].join(" ");

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Workspace</p>
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
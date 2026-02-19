import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard/admin", label: "Overview" },
  { to: "/dashboard/admin/users", label: "Users" },
  { to: "/dashboard/admin/accounts", label: "Accounts" },
  { to: "/dashboard/admin/analytics", label: "Analytics" },
  { to: "/dashboard/admin/commissions", label: "Commissions" },
  { to: "/dashboard/admin/audit", label: "Audit" },
  { to: "/dashboard/admin/settings", label: "Settings" },
];

export function AdminSubnav() {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] p-1">
      <div className="flex w-max gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard/admin"}
            className={({ isActive }) =>
              [
                "rounded-md px-3 py-2 text-xs font-semibold transition",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

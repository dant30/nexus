import React from "react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { id: "profile", label: "Profile", to: "/settings/profile" },
  { id: "trading", label: "Trading", to: "/settings/trading" },
  { id: "risk", label: "Risk", to: "/settings/risk" },
  { id: "billing", label: "Billing", to: "/settings/billing" },
];

const isActiveTab = (pathname, to) => pathname === to || (pathname === "/settings" && to === "/settings/profile");

export function SettingsTabs() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.to}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            isActiveTab(pathname, tab.to)
              ? "bg-accent text-ink"
              : "bg-slate-800 text-white/70 hover:bg-slate-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}


import React from "react";

const tabs = [
  { id: "auto", label: "Auto Trading" },
  { id: "signals", label: "Signal Monitor" },
];

export function TradingWorkspaceTabs({ activeTab = "auto", onTabChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange?.(tab.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            activeTab === tab.id
              ? "bg-accent text-ink"
              : "bg-slate-800 text-white/70 hover:bg-slate-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

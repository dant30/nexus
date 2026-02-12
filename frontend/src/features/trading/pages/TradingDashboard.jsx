import React, { useState } from "react";
import { AutoTrading } from "./AutoTrading.jsx";
import { SignalsMonitor } from "./SignalsMonitor.jsx";
import { OpenTrades } from "../components/TradeHistory/OpenTrades.jsx";
import { ClosedTrades } from "../components/TradeHistory/ClosedTrades.jsx";
import { TradeStats } from "../components/TradeHistory/TradeStats.jsx";
import { WSStatusBanner } from "../components/WSStatusBanner.jsx";
import { WSErrorToast } from "../components/WSErrorToast.jsx";

const tabs = [
  { id: "auto", label: "Auto" },
  { id: "signals", label: "Signals" },
];

export function TradingDashboard() {
  const [activeTab, setActiveTab] = useState("auto");

  return (
    <div className="space-y-6 p-6 text-white">
      <WSErrorToast />
      <div>
        <h2 className="text-xl font-semibold">Trading Dashboard</h2>
        <p className="text-sm text-white/60">Execute trades and monitor live signals.</p>
      </div>
      <WSStatusBanner />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-1 text-xs font-semibold ${
              activeTab === tab.id ? "bg-accent text-ink" : "bg-slate-800 text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "auto" && <AutoTrading />}
      {activeTab === "signals" && <SignalsMonitor />}

      <div className="grid gap-4 lg:grid-cols-3">
        <TradeStats />
        <OpenTrades />
        <ClosedTrades />
      </div>
    </div>
  );
}

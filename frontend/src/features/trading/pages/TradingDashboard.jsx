import React, { useMemo, useState } from "react";
import { AutoTrading } from "./AutoTrading.jsx";
import { SignalsMonitor } from "./SignalsMonitor.jsx";
import { TradesTable } from "../components/TradeHistory/TradesTable.jsx";
import { WSStatusBanner } from "../components/WSStatusBanner.jsx";
import { WSErrorToast } from "../components/WSErrorToast.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import {
  TradingHeader,
  TradingMetricsGrid,
  TradingWorkspaceTabs,
} from "../components/Dashboard/index.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveSymbol = (trade) => {
  return (
    trade?.symbol ||
    trade?.underlying ||
    trade?.shortcode ||
    trade?.market_symbol ||
    trade?.metadata?.symbol ||
    trade?.meta?.symbol ||
    "R_50"
  );
};

export function TradingDashboard() {
  const [activeTab, setActiveTab] = useState("auto");
  const { trades, openTrades, refresh, loading } = useTradingContext();
  const { activeAccount } = useAccountContext() || {};
  const { connected } = useWebSocket();

  const metrics = useMemo(() => {
    const all = Array.isArray(trades) ? trades : [];
    const open = Array.isArray(openTrades) ? openTrades : [];
    const closed = all.filter((trade) => String(trade.status || "").toUpperCase() !== "OPEN");
    const won = closed.filter((trade) => toNumber(trade.profit, 0) > 0).length;
    const winRate = closed.length ? (won / closed.length) * 100 : 0;
    const netProfit = closed.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
    return {
      totalTrades: all.length,
      openTrades: open.length,
      closedTrades: closed.length,
      winRate,
      netProfit,
      activeSymbol: resolveSymbol(open[0]) || resolveSymbol(all[0]) || "R_50",
    };
  }, [trades, openTrades]);

  return (
    <div className="space-y-6 p-4 text-white sm:p-6">
      <WSErrorToast />

      <TradingHeader
        onRefresh={refresh}
        loading={loading}
        connected={connected}
        selectedMode={activeTab}
      />

      <WSStatusBanner />

      <TradingMetricsGrid
        totalTrades={metrics.totalTrades}
        openTrades={metrics.openTrades}
        closedTrades={metrics.closedTrades}
        winRate={metrics.winRate}
        netProfit={metrics.netProfit}
        currency={activeAccount?.currency || "USD"}
        activeSymbol={metrics.activeSymbol}
      />

      <TradingWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "auto" ? <AutoTrading /> : <SignalsMonitor />}

      <div className="rounded-lg border border-white/10 bg-slate-800 p-4 shadow-card">
        <TradesTable
          trades={trades}
          loading={loading}
          connected={connected}
          currency={activeAccount?.currency || "USD"}
        />
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { AutoTrading } from "../../trading/pages/AutoTrading.jsx";
import { SignalsMonitor } from "../../trading/pages/SignalsMonitor.jsx";
import { OpenTrades } from "../../trading/components/TradeHistory/OpenTrades.jsx";
import { ClosedTrades } from "../../trading/components/TradeHistory/ClosedTrades.jsx";
import { TradeStats } from "../../trading/components/TradeHistory/TradeStats.jsx";
import { WSStatusBanner } from "../../trading/components/WSStatusBanner.jsx";
import { WSErrorToast } from "../../trading/components/WSErrorToast.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import {
  TradingHeader,
  TradingMetricsGrid,
  TradingWorkspaceTabs,
} from "../components/Trading/index.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function TradingDashboard() {
  const [activeTab, setActiveTab] = useState("auto");
  const { trades, openTrades, refresh, loading } = useTradingContext();
  const { activeAccount } = useAccountContext() || {};
  const { connected } = useWebSocket();

  const metrics = useMemo(() => {
    const all = Array.isArray(trades) ? trades : [];
    const open = Array.isArray(openTrades) ? openTrades : [];
    const closed = all.filter((trade) => trade.status !== "OPEN");
    const won = closed.filter((trade) => toNumber(trade.profit, 0) > 0).length;
    const winRate = closed.length ? (won / closed.length) * 100 : 0;
    const netProfit = closed.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
    return {
      totalTrades: all.length,
      openTrades: open.length,
      closedTrades: closed.length,
      winRate,
      netProfit,
      activeSymbol: open[0]?.symbol || all[0]?.symbol || "R_50",
    };
  }, [trades, openTrades]);

  return (
    <div className="space-y-6 p-6 text-white">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <TradeStats />
        <OpenTrades />
        <ClosedTrades />
      </div>
    </div>
  );
}

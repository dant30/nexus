import React, { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useSignals } from "../../trading/hooks/useSignals.js";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { BalanceCard } from "../components/StatCards/BalanceCard.jsx";
import { ProfitCard } from "../components/StatCards/ProfitCard.jsx";
import { WinRateCard } from "../components/StatCards/WinRateCard.jsx";
import { OpenTradesCard } from "../components/StatCards/OpenTradesCard.jsx";
import { PnLChart } from "../components/Charts/PnLChart.jsx";
import { WinLossChart } from "../components/Charts/WinLossChart.jsx";
import { DailyPerformance } from "../components/Charts/DailyPerformance.jsx";
import { MarketOverview } from "../components/MarketOverview.jsx";
import { RecentTrades } from "../components/RecentTrades.jsx";
import { SystemHealth } from "../components/SystemHealth.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseTradeTime = (trade) => {
  const raw = trade?.created_at || trade?.updated_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export function UserDashboard() {
  const { user } = useAuth();
  const { activeAccount, balanceLoading } = useAccountContext();
  const { trades, openTrades, loading, refresh } = useTradingContext();
  const { signals } = useSignals();
  const { connected } = useWebSocket();

  const metrics = useMemo(() => {
    const allTrades = Array.isArray(trades) ? trades : [];
    const closedTrades = allTrades.filter((trade) => trade.status !== "OPEN");
    const wonTrades = closedTrades.filter((trade) => toNumber(trade.profit, 0) > 0);
    const lostTrades = closedTrades.filter((trade) => toNumber(trade.profit, 0) < 0);

    const totalProfit = closedTrades.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
    const totalStake = closedTrades.reduce((sum, trade) => sum + toNumber(trade.stake, 0), 0);
    const openExposure = (openTrades || []).reduce(
      (sum, trade) => sum + toNumber(trade.stake, 0),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayProfit = closedTrades.reduce((sum, trade) => {
      const ts = parseTradeTime(trade);
      if (!ts) return sum;
      return ts >= today ? sum + toNumber(trade.profit, 0) : sum;
    }, 0);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const dayMap = new Map();
    for (let i = 0; i < 7; i += 1) {
      const keyDate = new Date(start);
      keyDate.setDate(start.getDate() + i);
      const key = keyDate.toISOString().slice(0, 10);
      dayMap.set(key, { key, label: keyDate.toLocaleDateString(undefined, { weekday: "short" }), pnl: 0, wins: 0, losses: 0 });
    }
    closedTrades.forEach((trade) => {
      const ts = parseTradeTime(trade);
      if (!ts) return;
      const key = ts.toISOString().slice(0, 10);
      if (!dayMap.has(key)) return;
      const entry = dayMap.get(key);
      const pnl = toNumber(trade.profit, 0);
      entry.pnl += pnl;
      if (pnl > 0) entry.wins += 1;
      if (pnl < 0) entry.losses += 1;
    });

    const dailySeries = Array.from(dayMap.values());
    const recentClosed = [...closedTrades]
      .sort((a, b) => toNumber(new Date(b.created_at).getTime(), 0) - toNumber(new Date(a.created_at).getTime(), 0))
      .slice(0, 8);

    return {
      totalTrades: closedTrades.length,
      openTrades: Array.isArray(openTrades) ? openTrades.length : 0,
      wins: wonTrades.length,
      losses: lostTrades.length,
      winRate: closedTrades.length ? (wonTrades.length / closedTrades.length) * 100 : 0,
      totalProfit,
      totalStake,
      todayProfit,
      openExposure,
      dailySeries,
      recentClosed,
    };
  }, [trades, openTrades]);

  const accountCurrency = activeAccount?.currency || "USD";
  const accountBalance = toNumber(activeAccount?.balance, 0);
  const displayName =
    user?.deriv_full_name?.trim() || user?.first_name || user?.username || "Trader";

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Welcome back, {displayName}</h2>
          <p className="text-sm text-white/60">
            Account overview, performance, and execution health in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BalanceCard
          balance={accountBalance}
          currency={accountCurrency}
          loading={balanceLoading}
          accountType={activeAccount?.account_type}
        />
        <ProfitCard
          totalProfit={metrics.totalProfit}
          todayProfit={metrics.todayProfit}
          currency={accountCurrency}
          roi={metrics.totalStake > 0 ? (metrics.totalProfit / metrics.totalStake) * 100 : 0}
        />
        <WinRateCard
          winRate={metrics.winRate}
          wins={metrics.wins}
          losses={metrics.losses}
          total={metrics.totalTrades}
        />
        <OpenTradesCard
          openTrades={metrics.openTrades}
          openExposure={metrics.openExposure}
          currency={accountCurrency}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <PnLChart series={metrics.dailySeries} currency={accountCurrency} />
          <div className="grid gap-4 lg:grid-cols-2">
            <WinLossChart wins={metrics.wins} losses={metrics.losses} />
            <DailyPerformance series={metrics.dailySeries} />
          </div>
        </div>
        <div className="space-y-4">
          <MarketOverview signals={signals} />
          <SystemHealth
            wsConnected={connected}
            tradeLoading={loading}
            accountReady={!!activeAccount?.id}
            activeAccountId={activeAccount?.deriv_account_id || activeAccount?.id}
          />
        </div>
      </div>

      <Card>
        <RecentTrades trades={metrics.recentClosed} currency={accountCurrency} />
      </Card>
    </div>
  );
}

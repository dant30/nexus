import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Clock3, AlertCircle } from "lucide-react";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useSignals } from "../../trading/hooks/useSignals.js";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { getTradingPreferences } from "../../settings/services/settingsService.js";
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
  const [refreshing, setRefreshing] = useState(false);
  const [defaultSymbol, setDefaultSymbol] = useState("R_50");

  useEffect(() => {
    let mounted = true;
    const loadDefaultSymbol = async () => {
      try {
        const prefs = await getTradingPreferences();
        if (!mounted) return;
        const configured = String(prefs?.defaultSymbol || "R_50").trim().toUpperCase();
        if (configured) setDefaultSymbol(configured);
      } catch {
        // Keep fallback symbol.
      }
    };
    loadDefaultSymbol();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const allTrades = Array.isArray(trades) ? trades : [];
    const closedTrades = allTrades.filter((trade) => trade.status !== "OPEN");
    const wonTrades = closedTrades.filter((trade) => toNumber(trade.profit, 0) > 0);
    const lostTrades = closedTrades.filter((trade) => toNumber(trade.profit, 0) < 0);

    const totalProfit = closedTrades.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
    const totalStake = closedTrades.reduce((sum, trade) => sum + toNumber(trade.stake, 0), 0);
    const openExposure = (openTrades || []).reduce((sum, trade) => sum + toNumber(trade.stake, 0), 0);

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
      dayMap.set(key, {
        key,
        label: keyDate.toLocaleDateString(undefined, { weekday: "short" }),
        pnl: 0,
        wins: 0,
        losses: 0,
      });
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
      .sort(
        (a, b) =>
          toNumber(new Date(b.created_at).getTime(), 0) -
          toNumber(new Date(a.created_at).getTime(), 0)
      )
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.resolve(refresh?.());
    } finally {
      setRefreshing(false);
    }
  };

  const accountCurrency = activeAccount?.currency || "USD";
  const accountBalance = toNumber(activeAccount?.balance, 0);
  const displayName =
    user?.deriv_full_name?.trim() || user?.first_name || user?.username || "Trader";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const roi = metrics.totalStake > 0 ? (metrics.totalProfit / metrics.totalStake) * 100 : 0;
  const accountReady = !!activeAccount?.id;

  return (
    <div className="space-y-5 p-4 text-white sm:space-y-6 sm:p-6">
      <Card className="border border-white/10 bg-gradient-to-r from-slate-900/70 via-slate-900/45 to-slate-900/70">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold sm:text-2xl">Good {greeting}, {displayName}</h2>
            <p className="mt-1 hidden text-sm text-white/60 sm:block">
              Your live account pulse, execution quality, and market position.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
              <span
                title={connected ? "Connected" : "Disconnected"}
                className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-300" : "bg-amber-300"}`}
              />
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/65 sm:px-3">
                <Clock3 size={11} />
                7D
              </span>
              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/65 sm:px-3">
                {metrics.totalTrades} trades
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-400/35 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:border-sky-300/50 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </Card>

      <div className="grid auto-rows-max gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BalanceCard
          balance={accountBalance}
          currency={accountCurrency}
          loading={balanceLoading}
          accountType={activeAccount?.account_type}
        />
        <ProfitCard
          totalProfit={metrics.totalProfit}
          todayProfit={metrics.todayProfit}
          roi={roi}
          currency={accountCurrency}
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

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PnLChart series={metrics.dailySeries} currency={accountCurrency} />

          <div className="grid gap-6 lg:grid-cols-2">
            <WinLossChart wins={metrics.wins} losses={metrics.losses} />
            <DailyPerformance series={metrics.dailySeries} />
          </div>
        </div>

        <div className="space-y-6">
          <MarketOverview signals={signals} defaultSymbol={defaultSymbol} />
          <SystemHealth
            wsConnected={connected}
            tradeLoading={loading}
            accountReady={accountReady}
            activeAccountId={activeAccount?.deriv_account_id || activeAccount?.id}
          />
        </div>
      </div>

      <Card className="border border-white/10">
        <RecentTrades trades={metrics.recentClosed} currency={accountCurrency} />
      </Card>

      {!accountReady ? (
        <Card className="border border-amber-400/30 bg-amber-400/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-amber-300" />
            <div>
              <p className="font-semibold text-amber-200">No Account Linked</p>
              <p className="mt-1 text-sm text-amber-100/75">
                Connect a Deriv account to start trading and unlock full performance metrics.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}





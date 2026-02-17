import React, { useMemo } from "react";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import {
  AdminHeader,
  AdminMetricsGrid,
  AccountControlsPanel,
  RuntimeSnapshotPanel,
  PerAccountPerformancePanel,
  toNumber,
  getAccountTypeLabel,
} from "../components/Admin/index.js";

export function AdminDashboard() {
  const { user } = useAuth();
  const {
    accounts = [],
    activeAccount,
    switchAccount,
    switching,
    balanceLoading,
  } = useAccountContext() || {};
  const { trades, openTrades, refresh: refreshTrades, loading: tradesLoading } =
    useTradingContext();
  const {
    connected,
    reconnectAttempts,
    reconnect,
    getStats,
  } = useWebSocket();

  const stats = useMemo(() => {
    const allTrades = Array.isArray(trades) ? trades : [];
    const opened = Array.isArray(openTrades) ? openTrades : [];
    const closed = allTrades.filter((t) => t.status !== "OPEN");
    const won = closed.filter((t) => toNumber(t.profit, 0) > 0);
    const lost = closed.filter((t) => toNumber(t.profit, 0) < 0);
    const totalProfit = closed.reduce((sum, t) => sum + toNumber(t.profit, 0), 0);
    const totalStake = closed.reduce((sum, t) => sum + toNumber(t.stake, 0), 0);

    const accountMap = new Map();
    allTrades.forEach((t) => {
      const key = Number(t.account_id);
      if (!Number.isFinite(key)) return;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountId: key,
          trades: 0,
          wins: 0,
          losses: 0,
          pnl: 0,
        });
      }
      const row = accountMap.get(key);
      row.trades += 1;
      const pnl = toNumber(t.profit, 0);
      row.pnl += pnl;
      if (pnl > 0) row.wins += 1;
      if (pnl < 0) row.losses += 1;
    });

    return {
      totalTrades: allTrades.length,
      closedTrades: closed.length,
      openTrades: opened.length,
      wonTrades: won.length,
      lostTrades: lost.length,
      winRate: closed.length ? (won.length / closed.length) * 100 : 0,
      totalProfit,
      roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
      perAccount: Array.from(accountMap.values()),
    };
  }, [trades, openTrades]);

  const wsStats = getStats?.() || {};
  const realAccounts = accounts.filter((a) =>
    getAccountTypeLabel(a.account_type) === "Real"
  ).length;
  const virtualAccounts = accounts.filter((a) =>
    getAccountTypeLabel(a.account_type) === "Virtual"
  ).length;

  return (
    <div className="space-y-6 p-6 text-white">
      <AdminHeader
        onRefreshMetrics={refreshTrades}
        onReconnectWS={reconnect}
        metricsLoading={tradesLoading}
      />

      <AdminMetricsGrid
        connected={connected}
        reconnectAttempts={reconnectAttempts}
        accountCount={accounts.length}
        realAccounts={realAccounts}
        virtualAccounts={virtualAccounts}
        openTrades={stats.openTrades}
        closedTrades={stats.closedTrades}
        winRate={stats.winRate}
        totalProfit={stats.totalProfit}
        roi={stats.roi}
        currency={activeAccount?.currency || "USD"}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <AccountControlsPanel
          accounts={accounts}
          activeAccount={activeAccount}
          onSwitchAccount={switchAccount}
          switching={switching}
        />
        <RuntimeSnapshotPanel
          user={user}
          wsStats={wsStats}
          balanceLoading={balanceLoading}
        />
      </div>

      <PerAccountPerformancePanel
        perAccount={stats.perAccount}
        accounts={accounts}
        fallbackCurrency={activeAccount?.currency || "USD"}
      />
    </div>
  );
}

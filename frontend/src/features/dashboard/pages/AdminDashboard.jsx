import React, { useMemo } from "react";
import { Activity, RefreshCw, Shield, Server, Wallet } from "lucide-react";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatMoney = (value, currency = "USD") =>
  `${toNumber(value, 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

const getAccountTypeLabel = (value = "") => {
  const raw = String(value).toLowerCase();
  if (raw.includes("virtual") || raw.includes("demo")) return "Virtual";
  if (raw.includes("real")) return "Real";
  return value || "Unknown";
};

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Admin Operations</h2>
          <p className="text-sm text-white/60">
            Runtime health, execution metrics, and account-level controls.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshTrades}
            disabled={tradesLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={tradesLoading ? "animate-spin" : ""} />
            Refresh Metrics
          </button>
          <button
            type="button"
            onClick={reconnect}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            <Server size={14} />
            Reconnect WS
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">System Status</p>
              <p className={`mt-2 text-xl font-semibold ${connected ? "text-emerald-300" : "text-rose-300"}`}>
                {connected ? "Connected" : "Disconnected"}
              </p>
              <p className="mt-1 text-xs text-white/50">Reconnect attempts: {reconnectAttempts || 0}</p>
            </div>
            <div className="rounded-lg bg-sky-400/15 p-2 text-sky-300">
              <Server size={18} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Accounts</p>
              <p className="mt-2 text-xl font-semibold text-white">{accounts.length}</p>
              <p className="mt-1 text-xs text-white/50">
                Real: {realAccounts} | Virtual: {virtualAccounts}
              </p>
            </div>
            <div className="rounded-lg bg-violet-400/15 p-2 text-violet-300">
              <Wallet size={18} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Execution</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {stats.openTrades} open / {stats.closedTrades} closed
              </p>
              <p className="mt-1 text-xs text-white/50">
                Win rate: {stats.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
              <Activity size={18} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Net P/L</p>
              <p
                className={`mt-2 text-xl font-semibold ${
                  stats.totalProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {stats.totalProfit >= 0 ? "+" : ""}
                {formatMoney(stats.totalProfit, activeAccount?.currency || "USD")}
              </p>
              <p className="mt-1 text-xs text-white/50">ROI: {stats.roi.toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-amber-400/15 p-2 text-amber-300">
              <Shield size={18} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Account Controls</p>
            <p className="text-xs text-white/50">
              Active: {activeAccount?.deriv_account_id || activeAccount?.id || "N/A"}
            </p>
          </div>

          {!accounts.length ? (
            <Empty message="No linked accounts found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="pb-2 pr-3 font-medium">Account</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Currency</th>
                    <th className="pb-2 pr-3 font-medium">Balance</th>
                    <th className="pb-2 pr-3 font-medium">Default</th>
                    <th className="pb-2 pr-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {accounts.map((account) => {
                    const isActive = Number(activeAccount?.id) === Number(account.id);
                    const accountType = getAccountTypeLabel(account.account_type);
                    return (
                      <tr key={account.id} className="border-b border-white/5">
                        <td className="py-2 pr-3">{account.deriv_account_id || account.id}</td>
                        <td className="py-2 pr-3">{accountType}</td>
                        <td className="py-2 pr-3">{account.currency || "-"}</td>
                        <td className="py-2 pr-3">
                          {formatMoney(account.balance, account.currency || "USD")}
                        </td>
                        <td className="py-2 pr-3">
                          {account.is_default ? (
                            <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">
                              Yes
                            </span>
                          ) : (
                            <span className="text-white/40">No</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            disabled={switching || isActive}
                            onClick={() => switchAccount?.(account.id)}
                            className="rounded border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActive ? "Active" : "Set Active"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-white/80">Runtime Snapshot</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/50">User</span>
              <span className="text-white/80">{user?.username || user?.deriv_full_name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">User ID</span>
              <span className="text-white/80">{user?.id || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">WS queued</span>
              <span className="text-white/80">{wsStats?.queuedMessages || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">WS listeners</span>
              <span className="text-white/80">{wsStats?.listenerCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Balance refresh</span>
              <span className={balanceLoading ? "text-amber-300" : "text-emerald-300"}>
                {balanceLoading ? "Updating..." : "Ready"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Per-Account Performance</div>
        {!stats.perAccount.length ? (
          <Empty message="No trade performance data yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.perAccount.map((row) => {
              const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : 0;
              const match = accounts.find((a) => Number(a.id) === Number(row.accountId));
              const label = match?.deriv_account_id || row.accountId;
              const currency = match?.currency || activeAccount?.currency || "USD";
              return (
                <div key={row.accountId} className="rounded border border-white/10 bg-slate-900/40 p-3 text-xs">
                  <p className="text-white/90">#{label}</p>
                  <p className="mt-1 text-white/50">{row.trades} trades</p>
                  <p className="mt-1 text-white/60">Win rate: {winRate.toFixed(1)}%</p>
                  <p className={`mt-1 font-semibold ${row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.pnl >= 0 ? "+" : ""}
                    {formatMoney(row.pnl, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

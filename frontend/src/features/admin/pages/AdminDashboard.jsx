import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { getAdminOverview, getAdminAnalytics } from "../services/adminService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function AdminDashboard() {
  const toast = useToast();
  const { connected, reconnectAttempts, reconnect } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    users: 0,
    accounts: 0,
    openTrades: 0,
    closedTrades: 0,
    winRate: 0,
    netProfit: 0,
    roi: 0,
  });
  const [topAccounts, setTopAccounts] = useState([]);
  const [topSymbols, setTopSymbols] = useState([]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [globalOverview, analytics] = await Promise.all([
        getAdminOverview(),
        getAdminAnalytics({ days: 30 }),
      ]);
      setOverview(globalOverview);
      setTopAccounts((analytics.accounts || []).slice(0, 8));
      setTopSymbols((analytics.symbols || []).slice(0, 8));
    } catch (error) {
      toast.error(error?.message || "Failed to load admin overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  return (
    <div className="space-y-6 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Admin Operations</h2>
            <p className="text-sm text-white/60">
              Global users, accounts and execution datasets.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadAdminData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={reconnect}
              className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
            >
              Reconnect WS
            </button>
          </div>
        </div>
      </Card>
      <AdminSubnav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wider text-white/50">System Status</p>
          <p className={`mt-2 text-xl font-semibold ${connected ? "text-emerald-300" : "text-rose-300"}`}>
            {connected ? "Connected" : "Disconnected"}
          </p>
          <p className="mt-1 text-xs text-white/50">Reconnect attempts: {reconnectAttempts || 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-white/50">Users / Accounts</p>
          <p className="mt-2 text-xl font-semibold text-white">{overview.users} / {overview.accounts}</p>
          <p className="mt-1 text-xs text-white/50">Global scope</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-white/50">Trades</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {overview.openTrades} open / {overview.closedTrades} closed
          </p>
          <p className="mt-1 text-xs text-white/50">Win rate: {overview.winRate.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-white/50">Net P/L</p>
          <p className={`mt-2 text-xl font-semibold ${overview.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {overview.netProfit >= 0 ? "+" : ""}
            {overview.netProfit.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-white/50">ROI: {overview.roi.toFixed(2)}%</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-semibold text-white/85">Top Accounts (30d)</p>
          <div className="space-y-2">
            {topAccounts.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-white/80">{row.accountLabel}</span>
                <span className="text-white/60">{row.trades} trades</span>
                <span className={row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {row.pnl >= 0 ? "+" : ""}
                  {row.pnl.toFixed(2)}
                </span>
              </div>
            ))}
            {!topAccounts.length && <p className="text-xs text-white/50">No account analytics yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-white/85">Top Symbols (30d)</p>
          <div className="space-y-2">
            {topSymbols.map((row) => (
              <div key={row.symbol} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                <span className="text-white/80">{row.symbol}</span>
                <span className="text-white/60">{row.trades} trades</span>
                <span className={row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {row.pnl >= 0 ? "+" : ""}
                  {row.pnl.toFixed(2)}
                </span>
              </div>
            ))}
            {!topSymbols.length && <p className="text-xs text-white/50">No symbol analytics yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

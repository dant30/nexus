import React, { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { buildAccountRows, buildSymbolPerformance } from "../services/adminService.js";

export function Analytics() {
  const { accounts = [], activeAccount } = useAccountContext() || {};
  const { trades = [], openTrades = [], refresh, loading } = useTradingContext();

  const accountRows = useMemo(() => buildAccountRows({ accounts, trades }), [accounts, trades]);
  const symbolRows = useMemo(() => buildSymbolPerformance({ trades }), [trades]);
  const summary = useMemo(() => {
    const closed = (Array.isArray(trades) ? trades : []).filter(
      (trade) => String(trade.status || "").toUpperCase() !== "OPEN"
    );
    const wins = closed.filter((trade) => Number(trade.profit || 0) > 0).length;
    const pnl = closed.reduce((sum, trade) => sum + Number(trade.profit || 0), 0);
    return {
      closedTrades: closed.length,
      openTrades: Array.isArray(openTrades) ? openTrades.length : 0,
      winRate: closed.length ? (wins / closed.length) * 100 : 0,
      pnl,
    };
  }, [trades, openTrades]);
  const currency = activeAccount?.currency || accounts[0]?.currency || "USD";

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">Analytics</p>
            <p className="mt-1 text-xs text-white/55">
              Account and symbol performance metrics with live refresh support.
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
      </Card>
      <AdminSubnav />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-white/50">Closed Trades</p>
          <p className="mt-1 text-lg font-semibold text-white/90">{summary.closedTrades}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-white/50">Open Trades</p>
          <p className="mt-1 text-lg font-semibold text-white/90">{summary.openTrades}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-white/50">Win Rate</p>
          <p className="mt-1 text-lg font-semibold text-white/90">{summary.winRate.toFixed(1)}%</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-white/50">Net P/L</p>
          <p className={`mt-1 text-lg font-semibold ${summary.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {summary.pnl >= 0 ? "+" : ""}
            {summary.pnl.toFixed(2)} {currency}
          </p>
        </Card>
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold text-white/85">Per-Account Analytics</p>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-white/[0.02] text-white/55">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Balance</th>
                <th className="px-3 py-2 font-medium">Trades</th>
                <th className="px-3 py-2 font-medium">Win Rate</th>
                <th className="px-3 py-2 font-medium">P/L</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {accountRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-3 py-2">{row.accountLabel}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">{row.balance.toFixed(2)} {row.currency}</td>
                  <td className="px-3 py-2">{row.trades}</td>
                  <td className="px-3 py-2">{row.winRate.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-semibold ${row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.pnl >= 0 ? "+" : ""}
                    {row.pnl.toFixed(2)} {row.currency}
                  </td>
                </tr>
              ))}
              {!accountRows.length && (
                <tr>
                  <td className="px-3 py-6 text-center text-white/50" colSpan={6}>
                    No account analytics available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-white/85">Per-Symbol Analytics</p>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-white/[0.02] text-white/55">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Trades</th>
                <th className="px-3 py-2 font-medium">Wins</th>
                <th className="px-3 py-2 font-medium">Losses</th>
                <th className="px-3 py-2 font-medium">Win Rate</th>
                <th className="px-3 py-2 font-medium">P/L</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {symbolRows.slice(0, 20).map((row) => (
                <tr key={row.symbol} className="border-b border-white/5">
                  <td className="px-3 py-2">{row.symbol}</td>
                  <td className="px-3 py-2">{row.trades}</td>
                  <td className="px-3 py-2 text-emerald-300">{row.wins}</td>
                  <td className="px-3 py-2 text-rose-300">{row.losses}</td>
                  <td className="px-3 py-2">{row.winRate.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-semibold ${row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.pnl >= 0 ? "+" : ""}
                    {row.pnl.toFixed(2)} {currency}
                  </td>
                </tr>
              ))}
              {!symbolRows.length && (
                <tr>
                  <td className="px-3 py-6 text-center text-white/50" colSpan={6}>
                    No symbol analytics available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

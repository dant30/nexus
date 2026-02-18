import React from "react";
import { Empty } from "../../../../shared/components/ui/misc/Empty.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

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

const statusBadgeClass = (status = "") => {
  const s = String(status).toUpperCase();
  if (s === "OPEN") return "border-sky-400/25 bg-sky-400/15 text-sky-300";
  if (s.includes("WON")) return "border-emerald-400/25 bg-emerald-400/15 text-emerald-300";
  if (s.includes("LOST") || s.includes("FAIL")) return "border-rose-400/25 bg-rose-400/15 text-rose-300";
  return "border-white/20 bg-white/10 text-white/70";
};

export function TradesTable({ trades = [], loading = false, currency = "USD", connected = false }) {
  const rows = Array.isArray(trades)
    ? [...trades]
        .sort((a, b) => toNumber(new Date(b.updated_at || b.created_at).getTime(), 0) - toNumber(new Date(a.updated_at || a.created_at).getTime(), 0))
        .slice(0, 40)
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white/80">Live Trades</p>
          <p className="mt-1 text-xs text-white/50">Open and settled trades updating in real time</p>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span
            title={connected ? "Live connected" : "Live disconnected"}
            className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-300" : "bg-amber-300"}`}
          />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/65">
            {rows.length} rows
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6 text-xs text-white/60">
          Loading live trades...
        </div>
      ) : !rows.length ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6">
          <Empty message="No trades yet." />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-white/[0.02] text-white/55">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Contract</th>
                <th className="px-3 py-2 font-medium">Stake</th>
                <th className="px-3 py-2 font-medium">P/L</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {rows.map((trade) => {
                const profit = trade.profit == null ? null : toNumber(trade.profit, 0);
                const time = trade.updated_at || trade.created_at;
                const ts = time
                  ? new Date(time).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      month: "short",
                      day: "numeric",
                    })
                  : "-";
                return (
                  <tr key={trade.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-white/60">{ts}</td>
                    <td className="px-3 py-2 font-medium text-white/85">{resolveSymbol(trade)}</td>
                    <td className="px-3 py-2">{trade.trade_type || "-"}</td>
                    <td className="px-3 py-2">{trade.contract || trade.direction || trade.contract_type || "-"}</td>
                    <td className="px-3 py-2">{formatMoney(trade.stake, currency)}</td>
                    <td className={`px-3 py-2 font-semibold ${profit == null ? "text-white/50" : profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {profit == null ? "-" : `${profit >= 0 ? "+" : ""}${formatMoney(profit, currency)}`}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full border px-3 py-2 text-[11px] font-semibold ${statusBadgeClass(trade.status)}`}>
                        {trade.status || "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

const statusClass = (status = "") => {
  const s = String(status).toUpperCase();
  if (s.includes("WON")) return "bg-emerald-400/15 text-emerald-300 border-emerald-400/25";
  if (s.includes("LOST") || s.includes("FAIL")) return "bg-rose-400/15 text-rose-300 border-rose-400/25";
  if (s.includes("OPEN")) return "bg-sky-400/15 text-sky-300 border-sky-400/25";
  return "bg-white/10 text-white/70 border-white/20";
};

export function RecentTrades({ trades = [], currency = "USD" }) {
  const wins = trades.filter((trade) => toNumber(trade.profit, 0) > 0).length;
  const losses = trades.filter((trade) => toNumber(trade.profit, 0) < 0).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white/80">Recent Closed Trades</p>
          <p className="mt-1 text-xs text-white/50">Latest execution outcomes and P/L snapshots</p>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/65">
            {trades.length} items
          </span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">
            {wins}W
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-rose-300">
            {losses}L
          </span>
        </div>
      </div>

      {!trades.length ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6">
          <Empty message="No closed trades yet." />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-white/[0.02] text-white/55">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Direction</th>
                <th className="px-3 py-2 font-medium">Stake</th>
                <th className="px-3 py-2 font-medium">P/L</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {trades.map((trade) => {
                const profit = toNumber(trade.profit, 0);
                const time = trade.created_at
                  ? new Date(trade.created_at).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      month: "short",
                      day: "numeric",
                    })
                  : "-";

                return (
                  <tr
                    key={trade.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2 text-white/60">{time}</td>
                    <td className="px-3 py-2 font-medium text-white/85">{trade.symbol || "-"}</td>
                    <td className="px-3 py-2">{trade.trade_type || "-"}</td>
                    <td className="px-3 py-2">{trade.contract || trade.direction || "-"}</td>
                    <td className="px-3 py-2">{formatMoney(trade.stake, currency)}</td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        profit >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatMoney(profit, currency)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                          trade.status
                        )}`}
                      >
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

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
  if (s.includes("WON")) return "bg-emerald-400/15 text-emerald-300";
  if (s.includes("LOST") || s.includes("FAIL")) return "bg-rose-400/15 text-rose-300";
  return "bg-white/10 text-white/70";
};

export function RecentTrades({ trades = [], currency = "USD" }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">Recent Closed Trades</p>
        <p className="text-xs text-white/50">{trades.length} items</p>
      </div>

      {!trades.length ? (
        <Empty message="No closed trades yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-white/50">
              <tr className="border-b border-white/10">
                <th className="pb-2 pr-3 font-medium">Time</th>
                <th className="pb-2 pr-3 font-medium">Symbol</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Direction</th>
                <th className="pb-2 pr-3 font-medium">Stake</th>
                <th className="pb-2 pr-3 font-medium">P/L</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
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
                  <tr key={trade.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="py-2 pr-3 text-white/60">{time}</td>
                    <td className="py-2 pr-3">{trade.symbol || "-"}</td>
                    <td className="py-2 pr-3">{trade.trade_type || "-"}</td>
                    <td className="py-2 pr-3">{trade.contract || trade.direction || "-"}</td>
                    <td className="py-2 pr-3">{formatMoney(trade.stake, currency)}</td>
                    <td className={`py-2 pr-3 font-semibold ${profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {profit >= 0 ? "+" : ""}
                      {formatMoney(profit, currency)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(trade.status)}`}>
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

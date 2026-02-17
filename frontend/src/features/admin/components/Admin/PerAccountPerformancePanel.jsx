import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../../shared/components/ui/misc/Empty.jsx";
import { formatMoney } from "./adminUtils.js";

export function PerAccountPerformancePanel({
  perAccount = [],
  accounts = [],
  fallbackCurrency = "USD",
}) {
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Per-Account Performance</div>
      {!perAccount.length ? (
        <Empty message="No trade performance data yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {perAccount.map((row) => {
            const winRate = row.trades > 0 ? (row.wins / row.trades) * 100 : 0;
            const match = accounts.find((a) => Number(a.id) === Number(row.accountId));
            const label = match?.deriv_account_id || row.accountId;
            const currency = match?.currency || fallbackCurrency;
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
  );
}


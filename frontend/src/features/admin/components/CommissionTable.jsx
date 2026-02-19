import React from "react";

export function CommissionTable({ rows = [], totals = { commission: 0, profit: 0 }, currency = "USD" }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Commission Collected</p>
          <p className="mt-1 text-sm font-semibold text-amber-300">
            {totals.commission.toFixed(2)} {currency}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Net P/L After Commission</p>
          <p className={`mt-1 text-sm font-semibold ${totals.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {totals.profit >= 0 ? "+" : ""}
            {totals.profit.toFixed(2)} {currency}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-white/[0.02] text-white/55">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Stake</th>
              <th className="px-3 py-2 font-medium">Commission</th>
              <th className="px-3 py-2 font-medium">Profit</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                <td className="px-3 py-2 text-white/60">{row.time}</td>
                <td className="px-3 py-2">{row.accountLabel}</td>
                <td className="px-3 py-2">{row.symbol}</td>
                <td className="px-3 py-2">{row.stake.toFixed(2)} {currency}</td>
                <td className="px-3 py-2 text-amber-300">{row.commission.toFixed(2)} {currency}</td>
                <td className={`px-3 py-2 font-semibold ${row.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {row.profit >= 0 ? "+" : ""}
                  {row.profit.toFixed(2)} {currency}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-[11px]">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-6 text-center text-white/50" colSpan={7}>
                  No commission records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

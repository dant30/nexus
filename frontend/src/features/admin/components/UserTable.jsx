import React from "react";

export function UserTable({ rows = [], onSelectUser }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-white/[0.02] text-white/55">
          <tr className="border-b border-white/10">
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Accounts</th>
            <th className="px-3 py-2 font-medium">Total Trades</th>
            <th className="px-3 py-2 font-medium">Win Rate</th>
            <th className="px-3 py-2 font-medium">P/L</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
              <td className="px-3 py-2">
                <p className="font-semibold text-white/90">{row.name}</p>
                <p className="mt-1 text-[11px] text-white/50">{row.email || row.username || "-"}</p>
              </td>
              <td className="px-3 py-2">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-[11px]">
                  {row.role}
                </span>
              </td>
              <td className="px-3 py-2">{row.accountCount}</td>
              <td className="px-3 py-2">{row.totalTrades}</td>
              <td className="px-3 py-2">{row.winRate.toFixed(1)}%</td>
              <td
                className={`px-3 py-2 font-semibold ${
                  row.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {row.netProfit >= 0 ? "+" : ""}
                {row.netProfit.toFixed(2)} {row.currency}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onSelectUser?.(row)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-accent"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="px-3 py-6 text-center text-white/50" colSpan={7}>
                No users available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

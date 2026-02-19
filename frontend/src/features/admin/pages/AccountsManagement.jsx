import React, { useMemo } from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { buildAccountRows } from "../services/adminService.js";

export function AccountsManagement() {
  const { accounts = [], activeAccount, switchAccount, switching } = useAccountContext() || {};
  const { trades = [] } = useTradingContext();
  const rows = useMemo(() => buildAccountRows({ accounts, trades }), [accounts, trades]);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <p className="text-sm font-semibold text-white/90">Accounts Management</p>
        <p className="mt-1 text-xs text-white/55">
          Manage linked accounts and inspect account-level execution metrics.
        </p>
      </Card>
      <AdminSubnav />

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-white/[0.02] text-white/55">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Currency</th>
              <th className="px-3 py-2 font-medium">Balance</th>
              <th className="px-3 py-2 font-medium">Trades</th>
              <th className="px-3 py-2 font-medium">Win Rate</th>
              <th className="px-3 py-2 font-medium">P/L</th>
              <th className="px-3 py-2 font-medium">Default</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {rows.map((row) => {
              const isActive = Number(activeAccount?.id) === Number(row.id);
              return (
                <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                  <td className="px-3 py-2">{row.accountLabel}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">{row.currency}</td>
                  <td className="px-3 py-2">{row.balance.toFixed(2)} {row.currency}</td>
                  <td className="px-3 py-2">{row.trades}</td>
                  <td className="px-3 py-2">{row.winRate.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-semibold ${row.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.pnl >= 0 ? "+" : ""}
                    {row.pnl.toFixed(2)} {row.currency}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full border px-3 py-2 text-[11px] ${
                        row.isDefault
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "border-white/20 bg-white/5 text-white/70"
                      }`}
                    >
                      {row.isDefault ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={switching || isActive}
                      onClick={() => switchAccount?.(row.id)}
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isActive ? "Active" : "Set Active"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="px-3 py-6 text-center text-white/50" colSpan={9}>
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

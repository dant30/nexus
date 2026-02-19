import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { getAdminAccounts } from "../services/adminService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function AccountsManagement() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { rows: accountRows } = await getAdminAccounts({
        search: query,
        limit: 150,
        offset: 0,
      });
      setRows(accountRows);
    } catch (error) {
      toast.error(error?.message || "Failed to load global accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAccounts();
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const token = query.trim().toLowerCase();
    if (!token) return true;
    return (
      String(row.accountLabel).toLowerCase().includes(token) ||
      String(row.userUsername || "").toLowerCase().includes(token) ||
      String(row.userEmail || "").toLowerCase().includes(token)
    );
  }), [rows, query]);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">Accounts Management</p>
            <p className="mt-1 text-xs text-white/55">
              Global accounts dataset with owner and risk-state visibility.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search account/user..."
                className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-accent/50"
              />
            </div>
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
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
              <th className="px-3 py-2 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                <td className="px-3 py-2">
                  <p>{row.accountLabel}</p>
                  <p className="mt-1 text-[11px] text-white/50">#{row.id}</p>
                </td>
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
                  <div className="text-[11px] text-white/70">{row.userUsername}</div>
                  <div className="mt-1 text-[11px] text-white/45">{row.userEmail}</div>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
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

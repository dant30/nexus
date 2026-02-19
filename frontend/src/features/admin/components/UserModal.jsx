import React from "react";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function UserModal({ user = null, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/90">{user.name}</p>
            <p className="mt-1 text-xs text-white/50">{user.email || user.username || "-"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/35 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Role</p>
            <p className="mt-1 text-sm text-white/85">{user.role}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Accounts</p>
            <p className="mt-1 text-sm text-white/85">{user.accountCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Closed Trades</p>
            <p className="mt-1 text-sm text-white/85">{user.totalTrades}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Win Rate</p>
            <p className="mt-1 text-sm text-white/85">{toNumber(user.winRate, 0).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Net Profit</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                toNumber(user.netProfit, 0) >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {toNumber(user.netProfit, 0) >= 0 ? "+" : ""}
              {toNumber(user.netProfit, 0).toFixed(2)} {user.currency}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Status</p>
            <p className="mt-1 text-sm text-white/85">{user.isActive ? "Active" : "Unknown"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

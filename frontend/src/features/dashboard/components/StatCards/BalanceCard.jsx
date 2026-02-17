import React from "react";
import { Wallet } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export function BalanceCard({ balance = 0, currency = "USD", loading = false, accountType = null }) {
  const type = String(accountType || "").toLowerCase();
  const typeLabel = type.includes("real") ? "Real Account" : type.includes("demo") || type.includes("virtual") ? "Demo Account" : "Deriv Account";
  const typeClass = type.includes("real") ? "text-rose-300" : "text-emerald-300";

  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">Account Balance</p>
            {loading ? <div className="h-3 w-3 rounded-full bg-emerald-300 animate-pulse" /> : null}
          </div>

          <p className="truncate text-2xl font-bold text-white sm:text-3xl">
            {loading ? "--" : formatMoney(balance, currency)}
          </p>

          <p className={`mt-2 text-xs font-medium uppercase tracking-wider ${typeClass}`}>{typeLabel}</p>
        </div>

        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 shadow-lg shadow-emerald-500/10 transition-transform duration-300 group-hover:scale-110">
          <Wallet size={22} />
        </div>
      </div>

      <div className="mt-4 border-t border-white/5 bg-white/[0.02] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Status</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              loading ? "bg-amber-400/15 text-amber-300" : balance > 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
            }`}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                loading ? "bg-amber-300" : balance > 0 ? "bg-emerald-300" : "bg-rose-300"
              }`}
            />
            {loading ? "Updating" : balance > 0 ? "Active" : "Empty"}
          </span>
        </div>
      </div>
    </Card>
  );
}

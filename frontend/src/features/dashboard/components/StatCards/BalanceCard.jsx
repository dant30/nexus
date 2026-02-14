import React from "react";
import { Wallet } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export function BalanceCard({ balance = 0, currency = "USD", loading = false, accountType = null }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? "Updating..." : formatMoney(balance, currency)}
          </p>
          <p className="mt-1 text-xs text-white/50">{accountType || "Deriv account"}</p>
        </div>
        <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
          <Wallet size={18} />
        </div>
      </div>
    </Card>
  );
}

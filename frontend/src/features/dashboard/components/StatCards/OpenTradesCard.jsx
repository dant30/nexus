import React from "react";
import { Layers } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export function OpenTradesCard({ openTrades = 0, openExposure = 0, currency = "USD" }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">Open Trades</p>
          <p className="mt-2 text-2xl font-semibold text-white">{openTrades}</p>
          <p className="mt-1 text-xs text-white/50">Exposure: {formatMoney(openExposure, currency)}</p>
        </div>
        <div className="rounded-lg bg-violet-400/15 p-2 text-violet-300">
          <Layers size={18} />
        </div>
      </div>
    </Card>
  );
}

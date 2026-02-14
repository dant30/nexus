import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function PnLChart({ series = [], currency = "USD" }) {
  const maxAbs = Math.max(
    1,
    ...series.map((item) => Math.abs(toNumber(item.pnl, 0)))
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">7-Day P/L</p>
        <p className="text-xs text-white/50">{currency}</p>
      </div>
      <div className="space-y-2">
        {series.map((item) => {
          const value = toNumber(item.pnl, 0);
          const width = `${Math.max(2, (Math.abs(value) / maxAbs) * 100)}%`;
          const positive = value >= 0;
          return (
            <div key={item.key} className="grid grid-cols-[56px_1fr_88px] items-center gap-3 text-xs">
              <span className="text-white/50">{item.label}</span>
              <div className="h-2 rounded bg-white/10">
                <div
                  className={`h-2 rounded ${positive ? "bg-emerald-300" : "bg-rose-300"}`}
                  style={{ width }}
                />
              </div>
              <span className={positive ? "text-emerald-300 text-right" : "text-rose-300 text-right"}>
                {positive ? "+" : ""}
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

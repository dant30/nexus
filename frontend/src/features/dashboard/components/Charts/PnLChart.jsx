import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function PnLChart({ series = [], currency = "USD" }) {
  const { maxAbs, total, avgDaily, bestDay, worstDay } = useMemo(() => {
    if (!series.length) {
      return { maxAbs: 1, total: 0, avgDaily: 0, bestDay: 0, worstDay: 0 };
    }

    const pnls = series.map((item) => toNumber(item.pnl, 0));
    const sum = pnls.reduce((a, b) => a + b, 0);

    return {
      maxAbs: Math.max(1, ...pnls.map((v) => Math.abs(v))),
      total: sum,
      avgDaily: sum / series.length,
      bestDay: Math.max(0, ...pnls),
      worstDay: Math.min(0, ...pnls),
    };
  }, [series]);

  if (!series.length) {
    return (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">7-Day P/L</p>
            <p className="mt-1 text-xs text-white/50">Daily profit/loss trend</p>
          </div>
          <TrendingUp size={20} className="text-white/20" />
        </div>
        <div className="py-10 text-center">
          <p className="text-sm text-white/50">No performance data available yet</p>
          <p className="mt-1 text-xs text-white/40">Execute your first trade to unlock analytics</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white/80">7-Day P/L</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium ${
                total >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
              }`}
            >
              <TrendingUp size={12} />
              {total >= 0 ? "+" : ""}
              {total.toFixed(2)} {currency}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Avg daily: {avgDaily >= 0 ? "+" : ""}
            {avgDaily.toFixed(2)} {currency}
          </p>
        </div>
        <p className="text-xs text-white/40">{currency}</p>
      </div>

      <div className="space-y-3">
        {series.map((item) => {
          const value = toNumber(item.pnl, 0);
          const width = `${Math.max(3, (Math.abs(value) / maxAbs) * 100)}%`;
          const positive = value >= 0;

          return (
            <div key={item.key} className="group">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="w-10 text-xs font-medium text-white/70">{item.label}</span>
                <span className={`text-xs font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                  {positive ? "+" : ""}
                  {value.toFixed(2)}
                </span>
              </div>
              <div className="h-5 overflow-hidden rounded-md border border-white/10 bg-white/5">
                <div
                  className={`h-full rounded-md transition-all duration-300 ${
                    positive
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-rose-500 to-rose-400"
                  }`}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
        <div className="text-center">
          <p className="mb-1 text-xs text-white/50">Best Day</p>
          <p className="text-sm font-semibold text-emerald-300">+{bestDay.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-white/50">Worst Day</p>
          <p className="text-sm font-semibold text-rose-300">{worstDay.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
}


import React, { useMemo } from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function DailyPerformance({ series = [] }) {
  const stats = useMemo(() => {
    if (!series.length) return { best: null, worst: null, avgTrades: 0 };

    const sorted = [...series].sort((a, b) => b.pnl - a.pnl);
    const avgTrades =
      series.reduce((sum, item) => sum + (item.wins || 0) + (item.losses || 0), 0) / series.length;

    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      avgTrades,
    };
  }, [series]);

  if (!series.length) {
    return (
      <Card>
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-white/80">No Data</p>
          <p className="mt-1 text-xs text-white/50">Daily performance tracking appears after closed trades</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Daily Outcomes</p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-white/60">
            {series.length} days
          </span>
        </div>

        <div className="space-y-2">
          {series.map((item) => {
            const wins = Number(item.wins || 0);
            const losses = Number(item.losses || 0);
            const totalTrades = wins + losses;
            const winPct = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
            const pnl = Number(item.pnl || 0);

            return (
              <div key={item.key} className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-xs">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="font-medium text-white/75">{item.label}</p>
                  <p className={pnl >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}
                  </p>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-rose-500" style={{ width: `${Math.max(0, Math.min(100, winPct))}%` }} />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
                  <span>{totalTrades} trades</span>
                  <span>{wins}W / {losses}L</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs text-white/60">
          <div>Best: {stats.best?.label || "-"}</div>
          <div>Worst: {stats.worst?.label || "-"}</div>
          <div>Avg trades/day: {stats.avgTrades.toFixed(1)}</div>
        </div>
      </div>
    </Card>
  );
}

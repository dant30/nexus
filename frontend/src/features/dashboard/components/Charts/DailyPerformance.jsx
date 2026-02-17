import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function DailyPerformance({ series = [] }) {
  if (!series.length) {
    return (
      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Daily Outcomes</div>
        <p className="text-xs text-white/55">No day-level outcomes yet.</p>
      </Card>
    );
  }

  const best = [...series].sort((a, b) => b.pnl - a.pnl)[0];
  const worst = [...series].sort((a, b) => a.pnl - b.pnl)[0];

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Daily Outcomes</div>
      <div className="space-y-2">
        {series.map((item) => {
          const trades = item.wins + item.losses;
          const bar = Math.min(100, trades * 20);
          return (
            <div key={item.key} className="rounded border border-white/10 bg-slate-900/40 px-3 py-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-white/60">{item.label}</span>
                <span className="text-white/40">{trades} trades</span>
              </div>
              <div className="mb-2 h-1.5 w-full rounded bg-white/10">
                <div className="h-1.5 rounded bg-sky-300" style={{ width: `${Math.max(6, bar)}%` }} />
              </div>
              <div className="flex gap-2">
                <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-emerald-300">W: {item.wins}</span>
                <span className="rounded bg-rose-400/15 px-2 py-0.5 text-rose-300">L: {item.losses}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">
        Best: {best?.label || "-"} | Worst: {worst?.label || "-"}
      </div>
    </Card>
  );
}

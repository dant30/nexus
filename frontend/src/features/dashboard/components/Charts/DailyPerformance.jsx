import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function DailyPerformance({ series = [] }) {
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Daily Outcomes</div>
      <div className="space-y-2">
        {series.map((item) => (
          <div key={item.key} className="rounded border border-white/10 bg-slate-900/40 px-3 py-2 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-white/60">{item.label}</span>
              <span className="text-white/40">
                {item.wins + item.losses} trades
              </span>
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-emerald-300">
                W: {item.wins}
              </span>
              <span className="rounded bg-rose-400/15 px-2 py-0.5 text-rose-300">
                L: {item.losses}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

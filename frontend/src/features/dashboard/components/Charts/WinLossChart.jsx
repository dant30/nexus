import React, { useMemo } from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function WinLossChart({ wins = 0, losses = 0 }) {
  const total = wins + losses;
  const winsPct = total > 0 ? (wins / total) * 100 : 0;
  const lossesPct = total > 0 ? (losses / total) * 100 : 0;

  const quality = useMemo(() => {
    if (winsPct >= 70) {
      return { label: "Strong", badge: "bg-emerald-400/15 text-emerald-300" };
    }
    if (winsPct >= 55) {
      return { label: "Solid", badge: "bg-sky-400/15 text-sky-300" };
    }
    return { label: "Balanced", badge: "bg-amber-400/15 text-amber-300" };
  }, [winsPct]);

  if (total === 0) {
    return (
      <Card>
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <p className="text-2xl text-white/40">-</p>
          </div>
          <p className="text-sm font-semibold text-white/80">No Trades Yet</p>
          <p className="mt-1 text-xs text-white/50">Execute trades to visualize win/loss ratio</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Win vs Loss</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quality.badge}`}>{quality.label}</span>
          </div>
          <p className="text-xs text-white/50">{total} total trades</p>
        </div>

        <div className="h-9 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner">
          <div className="flex h-full">
            <div
              className="rounded-l-xl bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${winsPct}%` }}
            />
            <div
              className="rounded-r-xl bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
              style={{ width: `${lossesPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/70">Wins</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-300">{wins}</p>
              <p className="text-sm text-emerald-300/70">{winsPct.toFixed(1)}%</p>
            </div>
          </div>

          <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-rose-300/70">Losses</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-rose-300">{losses}</p>
              <p className="text-sm text-rose-300/70">{lossesPct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

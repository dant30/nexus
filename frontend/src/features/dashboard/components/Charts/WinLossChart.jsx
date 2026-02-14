import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function WinLossChart({ wins = 0, losses = 0 }) {
  const total = wins + losses;
  const winsPct = total > 0 ? (wins / total) * 100 : 0;
  const lossesPct = total > 0 ? (losses / total) * 100 : 0;

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Win vs Loss</div>
      <div className="h-3 w-full overflow-hidden rounded bg-white/10">
        <div className="flex h-full">
          <div className="bg-emerald-300" style={{ width: `${winsPct}%` }} />
          <div className="bg-rose-300" style={{ width: `${lossesPct}%` }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-emerald-400/10 p-2 text-emerald-300">
          <p className="text-[11px] uppercase tracking-wider text-emerald-200/70">Wins</p>
          <p className="text-base font-semibold">{wins}</p>
        </div>
        <div className="rounded bg-rose-400/10 p-2 text-rose-300">
          <p className="text-[11px] uppercase tracking-wider text-rose-200/70">Losses</p>
          <p className="text-base font-semibold">{losses}</p>
        </div>
      </div>
    </Card>
  );
}

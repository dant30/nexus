import React from "react";
import { Target } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function WinRateCard({ winRate = 0, wins = 0, losses = 0, total = 0 }) {
  const clamped = Math.max(0, Math.min(100, winRate));
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">Win Rate</p>
          <p className="mt-2 text-2xl font-semibold text-white">{clamped.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-white/50">{wins} wins / {losses} losses</p>
        </div>
        <div className="rounded-lg bg-sky-400/15 p-2 text-sky-300">
          <Target size={18} />
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded bg-white/10">
        <div className="h-2 rounded bg-sky-300 transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/50">{total} closed trades</p>
    </Card>
  );
}

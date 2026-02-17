import React from "react";
import { Target } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const qualityLabel = (value) => {
  if (value >= 70) return { label: "Strong", color: "text-emerald-300" };
  if (value >= 55) return { label: "Solid", color: "text-sky-300" };
  if (value >= 45) return { label: "Balanced", color: "text-amber-300" };
  return { label: "Needs tuning", color: "text-rose-300" };
};

export function WinRateCard({ winRate = 0, wins = 0, losses = 0, total = 0 }) {
  const clamped = Math.max(0, Math.min(100, winRate));
  const quality = qualityLabel(clamped);

  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Win Rate</p>
          <p className="text-2xl font-bold text-white sm:text-3xl">{clamped.toFixed(1)}%</p>
          <p className="mt-2 text-sm text-white/60">
            <span className="font-semibold text-emerald-300">{wins}W</span>
            <span className="mx-1 text-white/40">/</span>
            <span className="font-semibold text-rose-300">{losses}L</span>
          </p>
        </div>

        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300 shadow-lg shadow-sky-500/10 transition-transform duration-300 group-hover:scale-110">
          <Target size={22} />
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-white/5 bg-white/[0.02] pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Execution Quality</span>
            <span className={`font-semibold ${quality.color}`}>{quality.label}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300 transition-all duration-500"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>
        <div className="text-xs text-white/50">{total > 0 ? `${total} trades analyzed` : "No trades yet"}</div>
      </div>
    </Card>
  );
}

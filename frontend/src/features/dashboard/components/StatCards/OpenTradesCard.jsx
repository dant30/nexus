import React from "react";
import { Layers } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export function OpenTradesCard({ openTrades = 0, openExposure = 0, currency = "USD" }) {
  const avgExposure = openTrades > 0 ? openExposure / openTrades : 0;
  const exposureTier =
    openTrades === 0
      ? { label: "Idle", badge: "border-white/10 bg-white/5 text-white/70" }
      : avgExposure > 10
      ? { label: "High", badge: "border-rose-400/30 bg-rose-400/10 text-rose-300" }
      : avgExposure > 5
      ? { label: "Moderate", badge: "border-amber-400/30 bg-amber-400/10 text-amber-300" }
      : { label: "Controlled", badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };

  return (
    <Card className="group relative min-h-[184px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Open Positions</p>
          <p className="text-2xl font-bold text-white sm:text-3xl">{openTrades}</p>
          <p className="mt-1 text-xs text-white/60">
            Exposure: <span className="font-semibold text-white/80">{formatMoney(openExposure, currency)}</span>
          </p>
        </div>

        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300 shadow-lg shadow-violet-500/10 transition-transform duration-300 group-hover:scale-110">
          <Layers size={22} />
        </div>
      </div>

      <div className="mt-3 border-t border-white/5 bg-white/[0.02] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/45">Profile</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${exposureTier.badge}`}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-current" />
            {exposureTier.label}
          </span>
        </div>
      </div>
    </Card>
  );
}


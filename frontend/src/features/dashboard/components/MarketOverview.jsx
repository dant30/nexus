import React from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveDirection = (signal) => {
  const raw =
    signal?.direction ||
    signal?.decision ||
    signal?.signal ||
    signal?.consensus?.decision ||
    signal?.consensus?.direction;
  const value = String(raw || "").toUpperCase();
  if (value.includes("FALL") || value.includes("PUT")) return "FALL";
  if (value.includes("RISE") || value.includes("CALL")) return "RISE";
  return "NEUTRAL";
};

const confidenceTier = (value) => {
  if (value >= 0.8) return { label: "Strong", className: "text-emerald-300" };
  if (value >= 0.6) return { label: "Moderate", className: "text-sky-300" };
  return { label: "Weak", className: "text-amber-300" };
};

export function MarketOverview({ signals = [] }) {
  const rows = (signals || [])
    .slice(0, 8)
    .map((signal, index) => {
      const direction = resolveDirection(signal);
      const confidence = toNumber(signal?.consensus?.confidence ?? signal?.confidence, 0);
      return {
        id: signal?.id || `${signal?.symbol || "symbol"}-${index}`,
        symbol:
          signal?.symbol ||
          signal?.underlying ||
          signal?.shortcode ||
          signal?.market_symbol ||
          signal?.metadata?.symbol ||
          signal?.meta?.symbol ||
          "R_50",
        direction,
        confidence,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">Market Overview</p>
            <p className="mt-1 text-xs text-white/50">Top live opportunities ranked by confidence</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60">
            <Activity size={12} />
            {rows.length} prioritized
          </span>
        </div>

        {!rows.length ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6">
            <Empty message="No live signals yet." />
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => {
              const isRise = row.direction === "RISE";
              const isFall = row.direction === "FALL";
              const pct = Math.max(0, Math.min(100, row.confidence * 100));
              const tier = confidenceTier(row.confidence);

              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-white/10 bg-slate-900/45 px-3 py-2.5 text-xs transition hover:border-white/20 hover:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white/90">{row.symbol}</p>
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold",
                        isRise
                          ? "bg-emerald-400/15 text-emerald-300"
                          : isFall
                          ? "bg-rose-400/15 text-rose-300"
                          : "bg-white/10 text-white/70",
                      ].join(" ")}
                    >
                      {isRise ? <ArrowUpRight size={12} /> : null}
                      {isFall ? <ArrowDownRight size={12} /> : null}
                      {row.direction}
                    </span>
                  </div>

                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className={
                        isRise
                          ? "h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                          : isFall
                          ? "h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-300"
                          : "h-1.5 rounded-full bg-white/40"
                      }
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-white/60">Confidence: {pct.toFixed(1)}%</p>
                    <p className={`font-semibold ${tier.className}`}>{tier.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

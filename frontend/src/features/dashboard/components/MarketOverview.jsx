import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
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

export function MarketOverview({ signals = [] }) {
  const rows = (signals || []).slice(0, 5).map((signal, index) => {
    const direction = resolveDirection(signal);
    const confidence = toNumber(
      signal?.consensus?.confidence ?? signal?.confidence,
      0
    );
    return {
      id: signal?.id || `${signal?.symbol || "symbol"}-${index}`,
      symbol: signal?.symbol || "N/A",
      direction,
      confidence,
    };
  });

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">Market Overview</p>
        <span className="text-xs text-white/50">{rows.length} tracked</span>
      </div>

      {!rows.length ? (
        <Empty message="No live signals yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isRise = row.direction === "RISE";
            const isFall = row.direction === "FALL";
            return (
              <div
                key={row.id}
                className="rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white/90">{row.symbol}</p>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold",
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
                <p className="mt-1 text-white/60">
                  Confidence: {(row.confidence * 100).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

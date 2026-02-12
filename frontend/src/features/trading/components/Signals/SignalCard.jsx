import React from "react";

export function SignalCard({ signal }) {
  const isNeutral =
    signal.direction === "NEUTRAL" || signal?.consensus?.decision === "NEUTRAL";

  return (
    <div className="rounded-lg bg-slate-800/70 p-3 text-xs text-white/80">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{signal.symbol}</span>
        <span className={isNeutral ? "text-white/40" : "text-emerald-300"}>
          {isNeutral ? "-" : `${(signal.confidence * 100).toFixed(0)}%`}
        </span>
      </div>
      <div className="mt-1 text-white/60">
        {isNeutral
          ? `No clear signal - ${signal.timeframe} - ${signal.source}`
          : `${
              (signal.direction === "RISE" && "Rise") ||
              (signal.direction === "FALL" && "Fall") ||
              signal.direction
            } - ${signal.timeframe} - ${signal.source}`}
      </div>
    </div>
  );
}

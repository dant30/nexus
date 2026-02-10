import React from "react";

export function SignalCard({ signal }) {
  return (
    <div className="rounded-lg bg-slate-800/70 p-3 text-xs text-white/80">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{signal.symbol}</span>
        <span className="text-emerald-300">{(signal.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-1 text-white/60">
        {(signal.direction === "RISE" && "Rise") || (signal.direction === "FALL" && "Fall") || signal.direction} •{" "}
        {signal.timeframe} • {signal.source}
      </div>
    </div>
  );
}

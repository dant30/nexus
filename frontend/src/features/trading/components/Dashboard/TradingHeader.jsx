import React from "react";
import { RefreshCw } from "lucide-react";

export function TradingHeader({
  onRefresh,
  loading = false,
  connected = false,
  selectedMode = "auto",
}) {
  const modeLabel = selectedMode === "signals" ? "Signal Intelligence" : "Auto Execution";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Trading Operations</h2>
        <p className="text-sm text-white/60">
          Execute strategies, monitor live consensus, and manage open exposure.
        </p>
        <p className="mt-1 text-xs text-white/45">
          Mode: {modeLabel} | WS: {connected ? "Connected" : "Disconnected"}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Refresh Trades
      </button>
    </div>
  );
}

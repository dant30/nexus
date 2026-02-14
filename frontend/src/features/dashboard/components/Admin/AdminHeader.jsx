import React from "react";
import { RefreshCw, Server } from "lucide-react";

export function AdminHeader({
  onRefreshMetrics,
  onReconnectWS,
  metricsLoading = false,
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Admin Operations</h2>
        <p className="text-sm text-white/60">
          Runtime health, execution metrics, and account-level controls.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRefreshMetrics}
          disabled={metricsLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={metricsLoading ? "animate-spin" : ""} />
          Refresh Metrics
        </button>
        <button
          type="button"
          onClick={onReconnectWS}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
        >
          <Server size={14} />
          Reconnect WS
        </button>
      </div>
    </div>
  );
}


import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";

const StatusBadge = ({ ok = false, label = "" }) => (
  <span
    className={[
      "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold",
      ok ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300",
    ].join(" ")}
  >
    {ok ? "OK" : "WARN"} - {label}
  </span>
);

export function SystemHealth({
  wsConnected = false,
  tradeLoading = false,
  accountReady = false,
  activeAccountId = null,
}) {
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">System Health</div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white/60">WebSocket</span>
          <StatusBadge ok={wsConnected} label={wsConnected ? "Connected" : "Disconnected"} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Trade Sync</span>
          <StatusBadge ok={!tradeLoading} label={tradeLoading ? "Syncing" : "Up to date"} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Account Link</span>
          <StatusBadge ok={accountReady} label={accountReady ? "Ready" : "Missing"} />
        </div>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
        Active account: {activeAccountId || "N/A"}
      </div>
    </Card>
  );
}

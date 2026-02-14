import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function RuntimeSnapshotPanel({
  user = null,
  wsStats = {},
  balanceLoading = false,
}) {
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Runtime Snapshot</div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white/50">User</span>
          <span className="text-white/80">{user?.username || user?.deriv_full_name || "N/A"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">User ID</span>
          <span className="text-white/80">{user?.id || "N/A"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">WS queued</span>
          <span className="text-white/80">{wsStats?.queuedMessages || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">WS listeners</span>
          <span className="text-white/80">{wsStats?.listenerCount || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/50">Balance refresh</span>
          <span className={balanceLoading ? "text-amber-300" : "text-emerald-300"}>
            {balanceLoading ? "Updating..." : "Ready"}
          </span>
        </div>
      </div>
    </Card>
  );
}


import React from "react";
import { useWebSocket } from "../../../providers/WSProvider.jsx";

export function WSStatusBanner() {
  const { connected, error, reconnect } = useWebSocket();

  if (connected) {
    return (
      <div className="rounded-lg bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
        Live data connected.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
      <span>{error ? "Live data error. Please reconnect." : "Connecting to live data..."}</span>
      <button
        className="rounded-md bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100"
        onClick={reconnect}
      >
        Reconnect
      </button>
    </div>
  );
}

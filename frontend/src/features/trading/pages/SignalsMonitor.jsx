import React from "react";
import { useSignals } from "../hooks/useSignals.js";
import { SignalCard } from "../components/Signals/SignalCard.jsx";
import { SignalConsensus } from "../components/Signals/SignalConsensus.jsx";
import { ConfidenceMetrics } from "../components/Signals/ConfidenceMetrics.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";

export function SignalsMonitor() {
  const { signals, loading } = useSignals();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SignalConsensus signals={signals} />
        <ConfidenceMetrics signals={signals} />
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-white/50">Loading signals...</div>
        ) : !signals?.length ? (
          <Empty message="No signals available." />
        ) : (
          signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
        )}
      </div>
    </div>
  );
}

import React from "react";
import { useSignals } from "../hooks/useSignals.js";
import { SignalCard } from "../components/Signals/SignalCard.jsx";
import { SignalConsensus } from "../components/Signals/SignalConsensus.jsx";
import { ConfidenceMetrics } from "../components/Signals/ConfidenceMetrics.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";

export function SignalsMonitor() {
  const { signalsTimeframeSeconds, setSignalsTimeframeSeconds } = useTradingContext();
  const activeInterval = signalsTimeframeSeconds > 0 ? signalsTimeframeSeconds : 60;
  const { signals, loading } = useSignals({
    liveMonitor: true,
    intervalSeconds: activeInterval,
  });

  const timeframeLabel = `${Math.max(1, Math.round(signalsTimeframeSeconds / 60))}m`;
  const filteredSignals =
    signalsTimeframeSeconds === 0
      ? signals
      : signals.filter((signal) => signal.timeframe === timeframeLabel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white/80">Signal Monitor</div>
        <Select
          value={signalsTimeframeSeconds}
          onChange={(event) => setSignalsTimeframeSeconds(Number(event.target.value))}
          className="max-w-[160px]"
        >
          <option value={0}>All</option>
          <option value={60}>1 minute</option>
          <option value={300}>5 minutes</option>
          <option value={900}>15 minutes</option>
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SignalConsensus signals={filteredSignals} />
        <ConfidenceMetrics signals={filteredSignals} />
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-white/50">Loading signals...</div>
        ) : !filteredSignals?.length ? (
          <Empty message="No signals available." />
        ) : (
          filteredSignals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
        )}
      </div>
    </div>
  );
}

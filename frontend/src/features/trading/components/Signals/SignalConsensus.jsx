import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function SignalConsensus({ signals }) {
  const average =
    signals?.length > 0
      ? signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length
      : 0;

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Consensus</div>
      <div className="text-2xl font-semibold text-emerald-300">
        {(average * 100).toFixed(0)}%
      </div>
      <p className="text-xs text-white/60">Average signal confidence</p>
    </Card>
  );
}

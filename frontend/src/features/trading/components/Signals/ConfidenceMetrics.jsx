import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function ConfidenceMetrics({ signals }) {
  const highConfidence = (signals || []).filter((signal) => signal.confidence >= 0.75).length;
  const total = signals?.length || 0;

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Confidence</div>
      <div className="text-2xl font-semibold text-white">
        {highConfidence}/{total}
      </div>
      <p className="text-xs text-white/60">Signals above 75%</p>
    </Card>
  );
}

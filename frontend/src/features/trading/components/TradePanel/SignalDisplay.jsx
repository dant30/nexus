import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { CardHeader } from "../../../../shared/components/ui/cards/CardHeader.jsx";
import { CardBody } from "../../../../shared/components/ui/cards/CardBody.jsx";

export function SignalDisplay({ signal }) {
  if (!signal) {
    return (
      <Card>
        <CardHeader className="text-white/70">Signal</CardHeader>
        <CardBody className="text-white/50">No signal available.</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-white/70">Signal</CardHeader>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{signal.symbol}</p>
            <p className="text-xs text-white/60">
              {signal.direction === "RISE" ? "Rise" : signal.direction === "FALL" ? "Fall" : signal.direction} •{" "}
              {signal.timeframe}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-300">
              {(signal.confidence * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-white/60">{signal.source}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

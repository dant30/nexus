import React from "react";
import { TRADING } from "../../../../core/constants/trading.js";

export function RiskWarning({ stake, isValid }) {
  if (!stake) {
    return (
      <p className="text-xs text-white/50">
        Min stake {TRADING.MIN_STAKE} • Max stake {TRADING.MAX_STAKE}
      </p>
    );
  }

  if (isValid) {
    return <p className="text-xs text-emerald-300">Stake is within risk limits.</p>;
  }

  return (
    <p className="text-xs text-amber-300">
      Stake must be between {TRADING.MIN_STAKE} and {TRADING.MAX_STAKE}.
    </p>
  );
}

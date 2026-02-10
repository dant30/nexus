import React from "react";
import { TradeButton as BaseTradeButton } from "../../../../shared/components/ui/buttons/TradeButton.jsx";

export function TradeButton({ loading, disabled, children = "Execute Trade", ...props }) {
  return (
    <BaseTradeButton
      disabled={disabled || loading}
      className={`w-full ${disabled || loading ? "opacity-60 cursor-not-allowed" : ""}`}
      {...props}
    >
      {loading ? "Executing..." : children}
    </BaseTradeButton>
  );
}

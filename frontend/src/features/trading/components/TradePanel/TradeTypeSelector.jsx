import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";
import { TRADING } from "../../../../core/constants/trading.js";

export function TradeTypeSelector({
  tradeType,
  contract,
  onTradeTypeChange,
  onContractChange,
}) {
  const contractOptions = TRADING.TRADE_TYPE_CONTRACTS[tradeType] || [];

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Trade Type</label>
        <Select value={tradeType} onChange={(event) => onTradeTypeChange?.(event.target.value)}>
          {TRADING.TRADE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Contract</label>
        <Select value={contract} onChange={(event) => onContractChange?.(event.target.value)}>
          {contractOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

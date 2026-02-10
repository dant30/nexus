import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";
import { TRADING } from "../../../../core/constants/trading.js";

export function TradeTypeSelector({
  tradeType,
  contractType,
  direction,
  onTradeTypeChange,
  onSelectionChange,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Trade Type</label>
        <Select value={tradeType} onChange={(event) => onTradeTypeChange?.(event.target.value)}>
          <option value="CALL_PUT">Call/Put</option>
          <option value="RISE_FALL">Rise/Fall</option>
        </Select>
      </div>

      {tradeType === "CALL_PUT" ? (
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Call/Put</label>
          <Select
            value={contractType}
            onChange={(event) => onSelectionChange?.({ contractType: event.target.value })}
          >
            {TRADING.CONTRACT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Rise/Fall</label>
          <Select
            value={direction}
            onChange={(event) => onSelectionChange?.({ direction: event.target.value })}
          >
            {TRADING.DIRECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}

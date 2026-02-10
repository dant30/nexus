import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";
import { TRADING } from "../../../../core/constants/trading.js";

export function ContractSelector({ contractType, direction, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Call/Put</label>
        <Select
          value={contractType}
          onChange={(event) => onChange?.({ contractType: event.target.value })}
        >
          {TRADING.CONTRACT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Rise/Fall</label>
        <Select value={direction} onChange={(event) => onChange?.({ direction: event.target.value })}>
          {TRADING.DIRECTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

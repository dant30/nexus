import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";

export function StrategySelector({ value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-white/70">Strategy</label>
      <Select value={value} onChange={(event) => onChange?.(event.target.value)}>
        <option value="scalping">Scalping</option>
        <option value="breakout">Breakout</option>
        <option value="momentum">Momentum</option>
      </Select>
    </div>
  );
}

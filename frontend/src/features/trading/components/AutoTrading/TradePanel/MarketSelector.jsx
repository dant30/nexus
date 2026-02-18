import React from "react";
import { Select } from "../../../../../shared/components/ui/inputs/Select.jsx";

const DEFAULT_MARKETS = [
  { value: "R_10", label: "Volatility 10 Index" },
  { value: "R_25", label: "Volatility 25 Index" },
  { value: "R_50", label: "Volatility 50 Index" },
  { value: "R_75", label: "Volatility 75 Index" },
  { value: "R_100", label: "Volatility 100 Index" },
];

export function MarketSelector({ value, onChange, options = DEFAULT_MARKETS }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-white/70">Market</label>
      <Select value={value} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}


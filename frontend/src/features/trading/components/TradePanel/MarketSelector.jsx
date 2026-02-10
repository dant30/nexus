import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";

const DEFAULT_MARKETS = [
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GBPUSD", label: "GBP/USD" },
  { value: "USDJPY", label: "USD/JPY" },
  { value: "AUDUSD", label: "AUD/USD" },
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

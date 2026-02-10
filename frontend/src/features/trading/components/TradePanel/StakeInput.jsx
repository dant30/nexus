import React from "react";
import { Input } from "../../../../shared/components/ui/inputs/Input.jsx";

export function StakeInput({ value, onChange, min, max }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-white/70">Stake</label>
      <Input
        type="number"
        min={min}
        max={max}
        step="0.01"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Enter stake"
      />
    </div>
  );
}

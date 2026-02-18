import React from "react";
import { Input } from "../../../../../shared/components/ui/inputs/Input.jsx";

export function StakeSettings({ value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-white/70">Stake per trade</label>
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}


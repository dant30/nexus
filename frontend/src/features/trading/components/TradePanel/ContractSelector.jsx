import React from "react";
import { Select } from "../../../../shared/components/ui/inputs/Select.jsx";

export function ContractSelector({ contractType, direction, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Contract</label>
        <Select
          value={contractType}
          onChange={(event) => onChange?.({ contractType: event.target.value })}
        >
          <option value="CALL">CALL</option>
          <option value="PUT">PUT</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-white/70">Direction</label>
        <Select value={direction} onChange={(event) => onChange?.({ direction: event.target.value })}>
          <option value="RISE">RISE</option>
          <option value="FALL">FALL</option>
        </Select>
      </div>
    </div>
  );
}

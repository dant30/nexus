import React from "react";

export function ConfirmDialog({ message = "Are you sure?", onConfirm, onCancel }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/90">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-2 rounded bg-slate-700 text-white">Cancel</button>
        <button onClick={onConfirm} className="px-3 py-2 rounded bg-danger text-white">Confirm</button>
      </div>
    </div>
  );
}

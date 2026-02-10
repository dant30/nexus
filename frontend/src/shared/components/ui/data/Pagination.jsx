import React from "react";

export function Pagination({ page = 1, total = 1, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => onChange(Math.max(1, page - 1))} className="px-2 py-1 rounded bg-slate-700 text-white/80">Prev</button>
      <div className="px-3 py-1 text-white/60">Page {page} / {total}</div>
      <button onClick={() => onChange(Math.min(total, page + 1))} className="px-2 py-1 rounded bg-slate-700 text-white/80">Next</button>
    </div>
  );
}

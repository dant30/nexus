import React from "react";

export function Tabs({ tabs = [], active = 0, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange?.(i)}
          className={`px-3 py-1 rounded-full text-sm ${i === active ? "bg-accent text-ink" : "bg-slate-700 text-white/80"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

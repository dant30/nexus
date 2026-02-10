import React from "react";

export function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-xs text-white ${className}`}>
      {children}
    </span>
  );
}

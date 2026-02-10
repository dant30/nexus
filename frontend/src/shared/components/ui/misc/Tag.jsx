import React from "react";

export function Tag({ children, className = "" }) {
  return <span className={`text-xs text-white bg-slate-700 px-2 py-1 rounded ${className}`}>{children}</span>;
}

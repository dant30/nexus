import React from "react";

export function Dialog({ children, className = "" }) {
  return <div className={`rounded-md bg-slate-800 p-6 ${className}`}>{children}</div>;
}

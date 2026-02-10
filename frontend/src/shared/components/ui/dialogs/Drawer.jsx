import React from "react";

export function Drawer({ children, className = "" }) {
  return <div className={`h-full w-full max-w-xs bg-slate-900 p-4 ${className}`}>{children}</div>;
}

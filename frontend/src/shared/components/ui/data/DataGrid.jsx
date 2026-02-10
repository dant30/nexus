import React from "react";

export function DataGrid({ children, className = "" }) {
  return <div className={`w-full overflow-auto rounded-md bg-slate-900 p-2 ${className}`}>{children}</div>;
}

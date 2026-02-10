import React from "react";

export function CardHeader({ children, className = "" }) {
  return <div className={`mb-2 font-semibold text-sm ${className}`}>{children}</div>;
}

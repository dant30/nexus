import React from "react";

export function Card({ children, className = "" }) {
  return <div className={`bg-slate-800 rounded-lg p-4 shadow-card ${className}`}>{children}</div>;
}

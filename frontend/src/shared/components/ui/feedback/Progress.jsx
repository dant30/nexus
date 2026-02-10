import React from "react";

export function Progress({ percent = 0, className = "" }) {
  return (
    <div className={`w-full bg-white/6 rounded-md h-2 ${className}`}>
      <div className="h-2 rounded-md bg-accent" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

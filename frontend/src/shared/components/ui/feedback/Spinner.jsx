import React from "react";

export function Spinner({ className = "" }) {
  return (
    <div
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-accent border-white/10 ${className}`}
    />
  );
}

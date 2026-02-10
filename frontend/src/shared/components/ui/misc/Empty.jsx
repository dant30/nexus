import React from "react";

export function Empty({ message = "No data", className = "" }) {
  return <div className={`text-white/50 italic ${className}`}>{message}</div>;
}

import React from "react";

export function Tooltip({ text, className = "" }) {
  return <span className={`text-white/70 text-sm ${className}`}>{text}</span>;
}

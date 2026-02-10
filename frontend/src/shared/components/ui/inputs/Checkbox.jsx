import React from "react";

export function Checkbox(props) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 rounded text-accent bg-slate-700 border-white/10 focus:ring-accent"
      {...props}
    />
  );
}

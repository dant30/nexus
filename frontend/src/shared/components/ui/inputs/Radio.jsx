import React from "react";

export function Radio(props) {
  return (
    <input
      type="radio"
      className="h-4 w-4 text-accent bg-slate-700 border-white/10 focus:ring-accent"
      {...props}
    />
  );
}

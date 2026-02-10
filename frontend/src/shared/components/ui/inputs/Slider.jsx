import React from "react";

export function Slider(props) {
  return (
    <input
      type="range"
      className="w-full accent-accent h-2 bg-slate-700 rounded"
      {...props}
    />
  );
}

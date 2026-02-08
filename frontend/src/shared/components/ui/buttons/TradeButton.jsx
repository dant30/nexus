import React from "react";

export function TradeButton({ children = "Trade", ...props }) {
  return (
    <button className="px-4 py-2 rounded bg-green-600 text-white" {...props}>
      {children}
    </button>
  );
}

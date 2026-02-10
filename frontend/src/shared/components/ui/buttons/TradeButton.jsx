import React from "react";

export function TradeButton({ children = "Trade", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 bg-accent text-ink font-semibold hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

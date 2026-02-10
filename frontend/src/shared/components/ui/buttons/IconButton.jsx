import React from "react";

export function IconButton({ children, className = "", size = 10, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md p-2 bg-transparent text-white/80 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
      {...props}
    >
      <span style={{ lineHeight: 0, display: "inline-flex", alignItems: "center" }}>{children}</span>
    </button>
  );
}

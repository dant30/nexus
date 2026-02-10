import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 bg-slate-700 text-white text-sm font-medium hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

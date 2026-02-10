import React from "react";

export function Modal({ children, className = "" }) {
  return (
    <div className={`max-w-2xl mx-auto rounded-lg bg-slate-900 border border-white/10 p-6 ${className}`}>
      {children}
    </div>
  );
}

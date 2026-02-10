import React from "react";

export function Loader({ size = 24 }) {
  return (
    <div className="flex items-center justify-center">
      <svg className="animate-spin text-accent" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

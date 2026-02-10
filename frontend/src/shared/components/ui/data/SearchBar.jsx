import React from "react";

export function SearchBar({ className = "", placeholder = "Search", ...props }) {
  return (
    <div className={`flex items-center gap-2 rounded-md bg-slate-700 px-2 py-1 ${className}`}>
      <input className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/40" placeholder={placeholder} {...props} />
    </div>
  );
}

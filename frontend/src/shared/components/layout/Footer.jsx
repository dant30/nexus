import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate/70">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 text-xs text-white/50">
        <span>© {year} Nexus Trading</span>
        <span>Precision. Discipline. Clarity.</span>
      </div>
    </footer>
  );
}

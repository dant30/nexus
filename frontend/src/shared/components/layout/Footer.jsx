import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:px-6 lg:px-8">
        <span>© {year} Nexus Trading</span>
        <span>Precision. Discipline. Clarity.</span>
      </div>
    </footer>
  );
}

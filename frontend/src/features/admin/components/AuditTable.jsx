import React from "react";

const severityClass = (level = "") => {
  const token = String(level).toUpperCase();
  if (token === "ERROR") return "border-rose-400/25 bg-rose-400/15 text-rose-300";
  if (token === "WARN") return "border-amber-400/25 bg-amber-400/15 text-amber-300";
  return "border-sky-400/25 bg-sky-400/15 text-sky-300";
};

export function AuditTable({ rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead className="bg-white/[0.02] text-white/55">
          <tr className="border-b border-white/10">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Level</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Account</th>
            <th className="px-3 py-2 font-medium">Message</th>
            <th className="px-3 py-2 font-medium">Meta</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
              <td className="px-3 py-2 text-white/60">{row.timeLabel}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${severityClass(row.level)}`}>
                  {row.level}
                </span>
              </td>
              <td className="px-3 py-2">{row.category}</td>
              <td className="px-3 py-2">{row.accountLabel}</td>
              <td className="px-3 py-2">{row.message}</td>
              <td className="px-3 py-2 text-white/55">{row.meta || "-"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="px-3 py-6 text-center text-white/50" colSpan={6}>
                No audit events available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import React from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";

const StatusBadge = ({ ok = false, label = "" }) => (
  <span
    className={[
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
      ok
        ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-300"
        : "border-amber-400/25 bg-amber-400/15 text-amber-300",
    ].join(" ")}
  >
    {ok ? "OK" : "WARN"} - {label}
  </span>
);

export function SystemHealth({
  wsConnected = false,
  tradeLoading = false,
  accountReady = false,
  activeAccountId = null,
}) {
  const checks = [wsConnected, !tradeLoading, accountReady];
  const healthy = checks.filter(Boolean).length;
  const healthPct = Math.round((healthy / checks.length) * 100);

  const grade =
    healthPct >= 100
      ? { label: "Excellent", className: "border-emerald-400/25 bg-emerald-400/15 text-emerald-300" }
      : healthPct >= 66
      ? { label: "Caution", className: "border-amber-400/25 bg-amber-400/15 text-amber-300" }
      : { label: "Risk", className: "border-rose-400/25 bg-rose-400/15 text-rose-300" };

  return (
    <Card className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">System Health</p>
            <p className="mt-1 text-xs text-white/50">Connectivity, sync, and account readiness</p>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-white/35" />
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${grade.className}`}>
              {healthPct}% {grade.label}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2">
            <span className="text-white/60">WebSocket</span>
            <StatusBadge ok={wsConnected} label={wsConnected ? "Connected" : "Disconnected"} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2">
            <span className="text-white/60">Trade Sync</span>
            <StatusBadge ok={!tradeLoading} label={tradeLoading ? "Syncing" : "Up to date"} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2">
            <span className="text-white/60">Account Link</span>
            <StatusBadge ok={accountReady} label={accountReady ? "Ready" : "Missing"} />
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/55">
          Active account: <span className="text-white/75">{activeAccountId || "N/A"}</span>
        </div>
      </div>
    </Card>
  );
}

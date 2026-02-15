import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";

export function CommissionTable({ stats = {} }) {
  const rows = [
    {
      label: "Commission Earned",
      value: Number(stats.commission_earned || 0),
      note: "Aggregated from affiliate commission transactions",
    },
    {
      label: "Referrals Converted",
      value: Number(stats.total_referrals || 0),
      note: "Total users linked to your code",
    },
    {
      label: "Code Usage",
      value: Number(stats.total_uses || 0),
      note: "Total successful code applications",
    },
  ];

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Referral Performance</div>
      {!rows.length ? (
        <Empty message="No referral performance data yet." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded border border-white/10 bg-slate-900/40 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-semibold text-white/80">{row.label}</p>
                <p className="text-white/50">{row.note}</p>
              </div>
              <p className="text-base font-semibold text-white">{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

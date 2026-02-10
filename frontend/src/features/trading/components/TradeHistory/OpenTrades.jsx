import React from "react";
import { useTradingContext } from "../../contexts/TradingContext.jsx";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../../shared/components/ui/misc/Empty.jsx";

export function OpenTrades() {
  const { openTrades, loading } = useTradingContext();

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Open Trades</div>
      {loading ? (
        <div className="text-xs text-white/50">Loading...</div>
      ) : !openTrades?.length ? (
        <Empty message="No open trades." />
      ) : (
        <div className="space-y-2">
          {openTrades.map((trade) => (
            <div key={trade.id} className="rounded-md bg-slate-900/60 p-2 text-xs text-white/80">
              <div className="flex items-center justify-between">
                <span>{trade.contract_type}</span>
                <span className="text-emerald-300">{trade.status}</span>
              </div>
              <div className="text-white/60">
                Stake {trade.stake} • {trade.direction}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

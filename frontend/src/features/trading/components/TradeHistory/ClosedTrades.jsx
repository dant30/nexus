import React from "react";
import { useTradingContext } from "../../contexts/TradingContext.jsx";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { Empty } from "../../../../shared/components/ui/misc/Empty.jsx";

const formatTradeType = (tradeType) => {
  if (tradeType === "CALL_PUT") return "Call/Put";
  if (tradeType === "RISE_FALL") return "Rise/Fall";
  return tradeType || "Trade";
};

export function ClosedTrades() {
  const { trades, loading } = useTradingContext();
  const closedTrades = (trades || []).filter((trade) => trade.status !== "OPEN");

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Recent Trades</div>
      {loading ? (
        <div className="text-xs text-white/50">Loading...</div>
      ) : !closedTrades.length ? (
        <Empty message="No closed trades yet." />
      ) : (
        <div className="space-y-2">
          {closedTrades.slice(0, 5).map((trade) => {
            const profitValue = Number(trade.profit ?? 0);
            return (
              <div key={trade.id} className="rounded-md bg-slate-900/60 p-2 text-xs text-white/80">
                <div className="flex items-center justify-between">
                  <span>{trade.contract || trade.direction || trade.contract_type}</span>
                  <span className={profitValue >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {profitValue}
                  </span>
                </div>
                <div className="text-white/60">
                  Stake {trade.stake} | {formatTradeType(trade.trade_type)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

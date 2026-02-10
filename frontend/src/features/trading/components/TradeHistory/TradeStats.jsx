import React, { useMemo } from "react";
import { useTradingContext } from "../../contexts/TradingContext.jsx";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function TradeStats() {
  const { trades, openTrades } = useTradingContext();
  const stats = useMemo(() => {
    const total = trades?.length || 0;
    const open = openTrades?.length || 0;
    const won = (trades || []).filter((trade) => Number(trade.profit) > 0).length;
    const lost = (trades || []).filter((trade) => Number(trade.profit) < 0).length;
    const winRate = total ? Math.round((won / total) * 100) : 0;
    return { total, open, won, lost, winRate };
  }, [trades, openTrades]);

  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white/80">Trade Stats</div>
      <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
        <div>
          <p className="text-white/50">Total Trades</p>
          <p className="text-base font-semibold text-white">{stats.total}</p>
        </div>
        <div>
          <p className="text-white/50">Open</p>
          <p className="text-base font-semibold text-white">{stats.open}</p>
        </div>
        <div>
          <p className="text-white/50">Won</p>
          <p className="text-base font-semibold text-emerald-300">{stats.won}</p>
        </div>
        <div>
          <p className="text-white/50">Win Rate</p>
          <p className="text-base font-semibold text-white">{stats.winRate}%</p>
        </div>
      </div>
    </Card>
  );
}

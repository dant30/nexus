import React from "react";
import { Activity, Clock3, Target, TrendingUp } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

export function TradingMetricsGrid({
  totalTrades = 0,
  openTrades = 0,
  closedTrades = 0,
  winRate = 0,
  netProfit = 0,
  currency = "USD",
  activeSymbol = "R_50",
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Trade Volume</p>
            <p className="mt-2 text-xl font-semibold text-white">{totalTrades}</p>
            <p className="mt-1 text-xs text-white/50">Closed: {closedTrades}</p>
          </div>
          <div className="rounded-lg bg-sky-400/15 p-2 text-sky-300">
            <Activity size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Open Positions</p>
            <p className="mt-2 text-xl font-semibold text-white">{openTrades}</p>
            <p className="mt-1 text-xs text-white/50">Symbol: {activeSymbol}</p>
          </div>
          <div className="rounded-lg bg-violet-400/15 p-2 text-violet-300">
            <Clock3 size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Win Rate</p>
            <p className="mt-2 text-xl font-semibold text-white">{winRate.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-white/50">Execution quality</p>
          </div>
          <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
            <Target size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Net P/L</p>
            <p className={`mt-2 text-xl font-semibold ${netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {netProfit >= 0 ? "+" : ""}
              {netProfit.toFixed(2)} {currency}
            </p>
            <p className="mt-1 text-xs text-white/50">Closed trades only</p>
          </div>
          <div className="rounded-lg bg-amber-400/15 p-2 text-amber-300">
            <TrendingUp size={18} />
          </div>
        </div>
      </Card>
    </div>
  );
}


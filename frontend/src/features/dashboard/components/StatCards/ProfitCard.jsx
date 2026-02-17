import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";

const formatMoney = (value, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export function ProfitCard({ totalProfit = 0, todayProfit = 0, roi = 0, currency = "USD" }) {
  const positive = totalProfit >= 0;
  const todayPositive = todayProfit >= 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">Net P/L</p>
          <p className={`mt-2 text-2xl font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
            {positive ? "+" : ""}
            {formatMoney(totalProfit, currency)}
          </p>
          <p className="mt-1 text-xs text-white/50">ROI: {roi.toFixed(2)}%</p>
        </div>
        <div className={`rounded-lg p-2 ${positive ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
          {positive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        </div>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white/50">Today</span>
          <span className={todayPositive ? "text-emerald-300" : "text-rose-300"}>
            {todayPositive ? "+" : ""}
            {formatMoney(todayProfit, currency)}
          </span>
        </div>
      </div>
    </Card>
  );
}

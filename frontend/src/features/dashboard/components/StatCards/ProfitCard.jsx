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
  const roiPositive = roi >= 0;

  return (
    <Card className="group relative overflow-hidden">
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
          positive ? "bg-gradient-to-br from-emerald-500/5 to-transparent" : "bg-gradient-to-br from-rose-500/5 to-transparent"
        }`}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/50">Net P/L</p>

          <p className={`text-2xl font-bold sm:text-3xl ${positive ? "text-emerald-300" : "text-rose-300"}`}>
            {positive ? "+" : ""}
            {formatMoney(totalProfit, currency)}
          </p>

          <p className="mt-2 text-sm text-white/60">
            ROI: <span className={`font-semibold ${roiPositive ? "text-emerald-300" : "text-rose-300"}`}>{roiPositive ? "+" : ""}{roi.toFixed(2)}%</span>
          </p>
        </div>

        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 ${
            positive ? "bg-emerald-400/15 text-emerald-300 shadow-emerald-500/10" : "bg-rose-400/15 text-rose-300 shadow-rose-500/10"
          }`}
        >
          {positive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
        </div>
      </div>

      <div className="mt-4 border-t border-white/5 bg-white/[0.02] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Today</span>
          <span className={`text-sm font-semibold ${todayPositive ? "text-emerald-300" : "text-rose-300"}`}>
            {todayPositive ? "+" : ""}
            {formatMoney(todayProfit, currency)}
          </span>
        </div>
      </div>
    </Card>
  );
}

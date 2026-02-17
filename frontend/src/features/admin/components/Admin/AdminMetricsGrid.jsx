import React from "react";
import { Activity, Shield, Server, Wallet } from "lucide-react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { formatMoney } from "./adminUtils.js";

export function AdminMetricsGrid({
  connected = false,
  reconnectAttempts = 0,
  accountCount = 0,
  realAccounts = 0,
  virtualAccounts = 0,
  openTrades = 0,
  closedTrades = 0,
  winRate = 0,
  totalProfit = 0,
  roi = 0,
  currency = "USD",
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">System Status</p>
            <p className={`mt-2 text-xl font-semibold ${connected ? "text-emerald-300" : "text-rose-300"}`}>
              {connected ? "Connected" : "Disconnected"}
            </p>
            <p className="mt-1 text-xs text-white/50">Reconnect attempts: {reconnectAttempts || 0}</p>
          </div>
          <div className="rounded-lg bg-sky-400/15 p-2 text-sky-300">
            <Server size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Accounts</p>
            <p className="mt-2 text-xl font-semibold text-white">{accountCount}</p>
            <p className="mt-1 text-xs text-white/50">
              Real: {realAccounts} | Virtual: {virtualAccounts}
            </p>
          </div>
          <div className="rounded-lg bg-violet-400/15 p-2 text-violet-300">
            <Wallet size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Execution</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {openTrades} open / {closedTrades} closed
            </p>
            <p className="mt-1 text-xs text-white/50">
              Win rate: {winRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
            <Activity size={18} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Net P/L</p>
            <p
              className={`mt-2 text-xl font-semibold ${
                totalProfit >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {totalProfit >= 0 ? "+" : ""}
              {formatMoney(totalProfit, currency)}
            </p>
            <p className="mt-1 text-xs text-white/50">ROI: {roi.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg bg-amber-400/15 p-2 text-amber-300">
            <Shield size={18} />
          </div>
        </div>
      </Card>
    </div>
  );
}


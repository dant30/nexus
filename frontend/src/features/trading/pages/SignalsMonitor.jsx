import React, { useEffect, useMemo, useState } from "react";
import { useSignals } from "../hooks/useSignals.js";
import { SignalConsensus } from "../components/Signals/SignalConsensus.jsx";
import { ConfidenceMetrics } from "../components/Signals/ConfidenceMetrics.jsx";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { getTradingPreferences } from "../../settings/services/settingsService.js";
import { buildDefaultSymbolStrategyRows } from "../utils/signalRanking.js";

export function SignalsMonitor() {
  const { signalsTimeframeSeconds, setSignalsTimeframeSeconds } = useTradingContext();
  const [defaultSymbol, setDefaultSymbol] = useState("R_50");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const prefs = await getTradingPreferences();
        if (!mounted) return;
        const configured = String(prefs?.defaultSymbol || "R_50").trim().toUpperCase();
        if (configured) setDefaultSymbol(configured);
      } catch {
        // Keep fallback symbol.
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeInterval = signalsTimeframeSeconds > 0 ? signalsTimeframeSeconds : 60;
  const { signals, loading } = useSignals({
    liveMonitor: true,
    intervalSeconds: activeInterval,
  });

  const timeframeLabel = `${Math.max(1, Math.round(signalsTimeframeSeconds / 60))}m`;
  const timeframeFiltered =
    signalsTimeframeSeconds === 0
      ? signals
      : signals.filter((signal) => signal.timeframe === timeframeLabel);

  const ranked = useMemo(
    () =>
      buildDefaultSymbolStrategyRows(timeframeFiltered, {
        defaultSymbol,
        recentSignals: 4,
        limit: 6,
      }),
    [timeframeFiltered, defaultSymbol]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white/80">
          Signal Monitor ({defaultSymbol} strategies)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={signalsTimeframeSeconds}
            onChange={(event) => setSignalsTimeframeSeconds(Number(event.target.value))}
            className="max-w-[160px]"
          >
            <option value={0}>All TF</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SignalConsensus signals={ranked} />
        <ConfidenceMetrics signals={ranked} />
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/85">Strategy Confidence</p>
          <p className="text-xs text-white/50">
            Top {ranked.length} strategies from recent {defaultSymbol} snapshots
          </p>
        </div>

        {loading ? (
          <div className="text-xs text-white/50">Loading signals...</div>
        ) : !ranked.length ? (
          <Empty message="No signals available for this filter." />
        ) : (
          <div className="space-y-2">
            {ranked.map((signal) => {
              const isRise = signal.direction === "RISE";
              const isFall = signal.direction === "FALL";
              const bar = Math.max(4, Math.min(100, signal.confidencePct));
              return (
                <div
                  key={signal.id || `${signal.symbol}-${signal.rank}`}
                  className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">#{signal.rank}</span>
                      <span className="font-semibold text-white">{signal.strategy}</span>
                    </div>
                    <span
                      className={[
                        "font-semibold",
                        isRise ? "text-emerald-300" : isFall ? "text-rose-300" : "text-white/70",
                      ].join(" ")}
                    >
                      {signal.direction}
                    </span>
                  </div>
                  <p className="mb-1 text-[11px] text-white/60">
                    {signal.latestReason || "No strategy rationale provided."}
                  </p>

                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className={
                        isRise
                          ? "h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                          : isFall
                          ? "h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-300"
                          : "h-1.5 rounded-full bg-white/40"
                      }
                      style={{ width: `${bar}%` }}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                    <span>{signal.confidencePct.toFixed(1)}%</span>
                    <span>
                      {signal.rank === 1 ? "Top confidence" : `-${signal.confidenceGapPct.toFixed(1)}% vs top`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { RefreshCw, Server } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import { AdminSubnav } from "../components/Admin/index.js";
import {
  getTradingPreferences,
  saveTradingPreferences,
  getRiskSettings,
  saveRiskSettings,
} from "../../settings/services/settingsService.js";

const defaultTradingState = {
  recoveryMode: "FIBONACCI",
  recoveryMultiplier: 1.6,
  minSignalConfidence: 0.7,
};

const defaultRiskState = {
  dailyLossLimit: 50,
  maxConsecutiveLosses: 5,
  maxStakePercent: 5,
};

export function SystemSettings() {
  const toast = useToast();
  const { reconnect, connected, reconnectAttempts } = useWebSocket();
  const { refresh, loading } = useTradingContext();
  const [tradingConfig, setTradingConfig] = useState(defaultTradingState);
  const [riskConfig, setRiskConfig] = useState(defaultRiskState);
  const [saving, setSaving] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const [tradingPrefs, riskPrefs] = await Promise.all([
          getTradingPreferences(),
          getRiskSettings(),
        ]);
        if (!mounted) return;
        setTradingConfig({
          recoveryMode: String(tradingPrefs.recoveryMode || "FIBONACCI").toUpperCase(),
          recoveryMultiplier: Number(tradingPrefs.recoveryMultiplier || 1.6),
          minSignalConfidence: Number(tradingPrefs.minSignalConfidence || 0.7),
        });
        setRiskConfig({
          dailyLossLimit: Number(riskPrefs.dailyLossLimit || 50),
          maxConsecutiveLosses: Number(riskPrefs.maxConsecutiveLosses || 5),
          maxStakePercent: Number(riskPrefs.maxStakePercent || 5),
        });
      } finally {
        if (mounted) setLoadingPrefs(false);
      }
    };
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveTradingPreferences(tradingConfig),
        saveRiskSettings(riskConfig),
      ]);
      toast.success("System preferences saved.");
    } catch {
      toast.error("Failed to save system preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">System Settings</p>
            <p className="mt-1 text-xs text-white/55">
              Runtime controls and default risk behavior for auto trading.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={reconnect}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
            >
              <Server size={14} />
              Reconnect WS
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">WebSocket</p>
            <p className={`mt-1 text-sm font-semibold ${connected ? "text-emerald-300" : "text-rose-300"}`}>
              {connected ? "Connected" : "Disconnected"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Reconnect Attempts</p>
            <p className="mt-1 text-sm font-semibold text-white/85">{reconnectAttempts || 0}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50">Preferences State</p>
            <p className="mt-1 text-sm font-semibold text-white/85">{loadingPrefs ? "Loading" : "Ready"}</p>
          </div>
        </div>
      </Card>
      <AdminSubnav />

      <Card>
        <div className="mb-3">
          <p className="text-sm font-semibold text-white/85">Trading Defaults</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Recovery Mode</label>
            <Select
              value={tradingConfig.recoveryMode}
              onChange={(event) =>
                setTradingConfig((prev) => ({
                  ...prev,
                  recoveryMode: String(event.target.value).toUpperCase(),
                }))
              }
            >
              <option value="FIBONACCI">Fibonacci</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Recovery Multiplier</label>
            <Input
              type="number"
              min="1"
              step="0.1"
              value={tradingConfig.recoveryMultiplier}
              onChange={(event) =>
                setTradingConfig((prev) => ({
                  ...prev,
                  recoveryMultiplier: Number(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Min Confidence</label>
            <Input
              type="number"
              min="0.5"
              max="1"
              step="0.01"
              value={tradingConfig.minSignalConfidence}
              onChange={(event) =>
                setTradingConfig((prev) => ({
                  ...prev,
                  minSignalConfidence: Number(event.target.value),
                }))
              }
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3">
          <p className="text-sm font-semibold text-white/85">Risk Defaults</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Daily Loss Limit</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={riskConfig.dailyLossLimit}
              onChange={(event) =>
                setRiskConfig((prev) => ({ ...prev, dailyLossLimit: Number(event.target.value) }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Max Consecutive Losses</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={riskConfig.maxConsecutiveLosses}
              onChange={(event) =>
                setRiskConfig((prev) => ({
                  ...prev,
                  maxConsecutiveLosses: Number(event.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Max Stake %</label>
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={riskConfig.maxStakePercent}
              onChange={(event) =>
                setRiskConfig((prev) => ({ ...prev, maxStakePercent: Number(event.target.value) }))
              }
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save System Settings"}
          </button>
        </div>
      </Card>
    </div>
  );
}

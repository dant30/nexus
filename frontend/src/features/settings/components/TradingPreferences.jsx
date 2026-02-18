import React from "react";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import {
  getTradingPreferences,
  saveTradingPreferences,
} from "../services/settingsService.js";

const RECOMMENDED_TRADING_PREFERENCES = {
  defaultStake: 1,
  minSignalConfidence: 0.7,
  cooldownSeconds: 10,
  maxTradesPerSession: 120,
  dailyProfitTarget: 0,
  sessionTakeProfit: 0,
  recoveryMode: "FIBONACCI",
  recoveryMultiplier: 1.6,
  timeframeSeconds: 60,
  signalsTimeframeSeconds: 0,
  defaultSymbol: "R_50",
};

export function TradingPreferences() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(RECOMMENDED_TRADING_PREFERENCES);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getTradingPreferences();
        if (mounted) {
          setForm({
            defaultStake: Number(data.defaultStake || RECOMMENDED_TRADING_PREFERENCES.defaultStake),
            minSignalConfidence: Number(data.minSignalConfidence || 0.7),
            cooldownSeconds: Number(data.cooldownSeconds || 10),
            maxTradesPerSession: Number(
              data.maxTradesPerSession || RECOMMENDED_TRADING_PREFERENCES.maxTradesPerSession
            ),
            dailyProfitTarget: Number(data.dailyProfitTarget || 0),
            sessionTakeProfit: Number(data.sessionTakeProfit || 0),
            recoveryMode: String(data.recoveryMode || "FIBONACCI").toUpperCase(),
            recoveryMultiplier: Number(data.recoveryMultiplier || 1.6),
            timeframeSeconds: Number(data.timeframeSeconds || 60),
            signalsTimeframeSeconds: Number(data.signalsTimeframeSeconds || 0),
            defaultSymbol: String(data.defaultSymbol || "R_50").toUpperCase(),
          });
        }
      } catch (error) {
        toast.error("Failed to load trading preferences.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveTradingPreferences(form);
      localStorage.setItem("nexus:trading:timeframe", String(form.timeframeSeconds));
      localStorage.setItem(
        "nexus:trading:signals_timeframe",
        String(form.signalsTimeframeSeconds)
      );
      toast.success("Trading preferences saved.");
    } catch (error) {
      toast.error("Failed to save trading preferences.");
    } finally {
      setSaving(false);
    }
  };

  const onResetRecommended = async () => {
    setSaving(true);
    try {
      setForm(RECOMMENDED_TRADING_PREFERENCES);
      await saveTradingPreferences(RECOMMENDED_TRADING_PREFERENCES);
      localStorage.setItem(
        "nexus:trading:timeframe",
        String(RECOMMENDED_TRADING_PREFERENCES.timeframeSeconds)
      );
      localStorage.setItem(
        "nexus:trading:signals_timeframe",
        String(RECOMMENDED_TRADING_PREFERENCES.signalsTimeframeSeconds)
      );
      toast.success("Recommended trading defaults restored.");
    } catch (error) {
      toast.error("Failed to reset trading preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Default Stake</label>
          <Input
            type="number"
            min="0.35"
            step="0.01"
            value={form.defaultStake}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, defaultStake: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Min Confidence</label>
          <Input
            type="number"
            min="0.5"
            max="1"
            step="0.01"
            value={form.minSignalConfidence}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, minSignalConfidence: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Cooldown (sec)</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.cooldownSeconds}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, cooldownSeconds: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Max Trades / Session</label>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.maxTradesPerSession}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxTradesPerSession: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">
            Daily Profit Target
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.dailyProfitTarget}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, dailyProfitTarget: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">
            Session Take-Profit
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.sessionTakeProfit}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sessionTakeProfit: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Recovery Mode</label>
          <Select
            value={form.recoveryMode}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, recoveryMode: String(event.target.value).toUpperCase() }))
            }
            disabled={loading}
          >
            <option value="FIBONACCI">Fibonacci</option>
            <option value="HYBRID">Hybrid (Fib + Martingale)</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">
            Recovery Multiplier
          </label>
          <Input
            type="number"
            min="1"
            step="0.1"
            value={form.recoveryMultiplier}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, recoveryMultiplier: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Default Timeframe</label>
          <Select
            value={form.timeframeSeconds}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, timeframeSeconds: Number(event.target.value) }))
            }
            disabled={loading}
          >
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Signals Timeframe</label>
          <Select
            value={form.signalsTimeframeSeconds}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                signalsTimeframeSeconds: Number(event.target.value),
              }))
            }
            disabled={loading}
          >
            <option value={0}>All</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Trading Preferences"}
        </button>
        <button
          type="button"
          disabled={saving || loading}
          onClick={onResetRecommended}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to Recommended
        </button>
      </div>
    </form>
  );
}



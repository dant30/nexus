import React from "react";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import {
  getTradingPreferences,
  saveTradingPreferences,
} from "../services/settingsService.js";

export function TradingPreferences() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    defaultStake: 5,
    minSignalConfidence: 0.7,
    cooldownSeconds: 10,
    maxTradesPerSession: 5,
    dailyProfitTarget: 0,
    sessionTakeProfit: 0,
    timeframeSeconds: 60,
    signalsTimeframeSeconds: 0,
  });

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getTradingPreferences();
        if (mounted) {
          setForm({
            defaultStake: Number(data.defaultStake || 5),
            minSignalConfidence: Number(data.minSignalConfidence || 0.7),
            cooldownSeconds: Number(data.cooldownSeconds || 10),
            maxTradesPerSession: Number(data.maxTradesPerSession || 5),
            dailyProfitTarget: Number(data.dailyProfitTarget || 0),
            sessionTakeProfit: Number(data.sessionTakeProfit || 0),
            timeframeSeconds: Number(data.timeframeSeconds || 60),
            signalsTimeframeSeconds: Number(data.signalsTimeframeSeconds || 0),
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
  }, [toast]);

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
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Trading Preferences"}
      </button>
    </form>
  );
}

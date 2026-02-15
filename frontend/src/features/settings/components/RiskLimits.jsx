import React from "react";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import { getRiskSettings, saveRiskSettings } from "../services/settingsService.js";

export function RiskLimits() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    dailyLossLimit: 50,
    maxConsecutiveLosses: 5,
    maxStakePercent: 5,
    stopOnHighRisk: true,
  });

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getRiskSettings();
        if (mounted) {
          setForm({
            dailyLossLimit: Number(data.dailyLossLimit || 50),
            maxConsecutiveLosses: Number(data.maxConsecutiveLosses || 5),
            maxStakePercent: Number(data.maxStakePercent || 5),
            stopOnHighRisk: Boolean(data.stopOnHighRisk),
          });
        }
      } catch (error) {
        toast.error("Failed to load risk settings.");
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
      await saveRiskSettings(form);
      toast.success("Risk settings saved.");
    } catch (error) {
      toast.error("Failed to save risk settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Daily Loss Limit</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.dailyLossLimit}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, dailyLossLimit: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">
            Max Consecutive Losses
          </label>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.maxConsecutiveLosses}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                maxConsecutiveLosses: Number(event.target.value),
              }))
            }
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-white/70">Max Stake % of Balance</label>
          <Input
            type="number"
            min="1"
            max="100"
            step="1"
            value={form.maxStakePercent}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxStakePercent: Number(event.target.value) }))
            }
            disabled={loading}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="stopOnHighRisk"
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-slate-700"
            checked={form.stopOnHighRisk}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, stopOnHighRisk: event.target.checked }))
            }
            disabled={loading}
          />
          <label htmlFor="stopOnHighRisk" className="text-xs text-white/80">
            Stop trading on high-risk conditions
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Risk Limits"}
      </button>
    </form>
  );
}

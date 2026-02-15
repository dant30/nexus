import React from "react";
import { RefreshCw } from "lucide-react";
import { ReferralLink } from "../components/ReferralLink.jsx";
import { StatsCards } from "../components/StatsCards.jsx";
import { CommissionTable } from "../components/CommissionTable.jsx";
import {
  buildReferralLink,
  fetchAffiliateCode,
  fetchReferralStats,
} from "../services/referralService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function ReferralDashboard() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [stats, setStats] = React.useState({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [codeData, statsData] = await Promise.all([
        fetchAffiliateCode().catch(() => null),
        fetchReferralStats().catch(() => ({})),
      ]);
      const resolvedCode = codeData?.code || statsData?.affiliate_code || "";
      setCode(resolvedCode);
      setStats(statsData || {});
    } catch (error) {
      toast.error("Failed to load referral data.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const referralLink = buildReferralLink(code);

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Referral Dashboard</h2>
          <p className="text-sm text-white/60">
            Track affiliate performance and share your referral link.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <ReferralLink code={code} link={referralLink} />
      <StatsCards stats={stats} />
      <CommissionTable stats={stats} />
    </div>
  );
}

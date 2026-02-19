import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { CommissionTable } from "../components/CommissionTable.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { getAdminCommissions } from "../services/adminService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function CommissionRules() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ commission: 0, profit: 0 });
  const [currency, setCurrency] = useState("USD");

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const data = await getAdminCommissions({ limit: 120 });
      setRows(data.rows);
      setTotals(data.totals);
      if (data.rows[0]?.currency) {
        setCurrency(data.rows[0].currency);
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load global commissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, []);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">Commission Rules</p>
            <p className="mt-1 text-xs text-white/55">
              Global settled-trade commissions across all accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={loadCommissions}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </Card>
      <AdminSubnav />

      <CommissionTable rows={rows} totals={totals} currency={currency} />
    </div>
  );
}

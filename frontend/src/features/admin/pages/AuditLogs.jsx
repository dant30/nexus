import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { AuditTable } from "../components/AuditTable.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { getAdminAudit } from "../services/auditService.js";
import { useToast } from "../../notifications/hooks/useToast.js";

export function AuditLogs() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const data = await getAdminAudit({ limit: 180 });
      setRows(data.rows);
    } catch (error) {
      toast.error(error?.message || "Failed to load audit feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
    const interval = setInterval(() => {
      loadAudit();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/90">Audit Logs</p>
            <p className="mt-1 text-xs text-white/55">
              Global operational activity feed (trades, accounts, users).
            </p>
          </div>
          <button
            type="button"
            onClick={loadAudit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </Card>
      <AdminSubnav />

      <AuditTable rows={rows} />
    </div>
  );
}

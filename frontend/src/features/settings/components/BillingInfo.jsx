import React from "react";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import {
  getBillingSummary,
  getBillingTransactions,
} from "../services/settingsService.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function BillingInfo() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState({ total_balance: "0" });
  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [balance, txs] = await Promise.all([
          getBillingSummary(),
          getBillingTransactions(20),
        ]);
        if (!mounted) return;
        setSummary(balance || { total_balance: "0" });
        setTransactions(Array.isArray(txs) ? txs : []);
      } catch (error) {
        toast.error("Failed to load billing information.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
        <p className="text-xs uppercase tracking-wider text-white/50">Total Balance</p>
        <p className="mt-2 text-2xl font-semibold text-white">
          {toNumber(summary.total_balance, 0).toFixed(2)}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-white/80">Recent Transactions</p>
        {loading ? (
          <div className="text-xs text-white/50">Loading billing transactions...</div>
        ) : !transactions.length ? (
          <Empty message="No transactions found." />
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-md border border-white/10 bg-slate-900/40 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-white/80">{tx.tx_type}</p>
                  <p className="text-white/50">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/80">{tx.amount}</p>
                  <p className="text-white/50">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

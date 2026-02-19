import React, { useMemo } from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { CommissionTable } from "../components/CommissionTable.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { buildCommissionRows } from "../services/adminService.js";

export function CommissionRules() {
  const { accounts = [], activeAccount } = useAccountContext() || {};
  const { trades = [] } = useTradingContext();
  const { rows, totals } = useMemo(
    () => buildCommissionRows({ trades, accounts }),
    [trades, accounts]
  );
  const currency = activeAccount?.currency || accounts[0]?.currency || "USD";

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <p className="text-sm font-semibold text-white/90">Commission Rules</p>
        <p className="mt-1 text-xs text-white/55">
          Realized trade commission visibility and settled-trade breakdown.
        </p>
      </Card>
      <AdminSubnav />

      <CommissionTable rows={rows} totals={totals} currency={currency} />
    </div>
  );
}

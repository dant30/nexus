import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../../trading/contexts/TradingContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { AuditTable } from "../components/AuditTable.jsx";
import { AdminSubnav } from "../components/Admin/index.js";
import { buildAuditRows, createLiveAuditRow } from "../services/auditService.js";

export function AuditLogs() {
  const { trades = [] } = useTradingContext();
  const { accounts = [] } = useAccountContext() || {};
  const ws = useWebSocket();
  const [liveRows, setLiveRows] = useState([]);

  useEffect(() => {
    const offTradeStatus = ws.onMessage("trade_status", (payload = {}) => {
      setLiveRows((prev) =>
        [createLiveAuditRow({ type: "trade_status", payload }), ...prev].slice(0, 80)
      );
    });
    const offSignals = ws.onMessage("signals_snapshot", (payload = {}) => {
      setLiveRows((prev) =>
        [createLiveAuditRow({ type: "signals_snapshot", payload }), ...prev].slice(0, 80)
      );
    });
    return () => {
      offTradeStatus?.();
      offSignals?.();
    };
  }, [ws]);

  const snapshotRows = useMemo(
    () => buildAuditRows({ trades, accounts, ws }),
    [trades, accounts, ws.connected, ws.reconnectAttempts]
  );
  const rows = [...liveRows, ...snapshotRows].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 200);

  return (
    <div className="space-y-4 p-6 text-white">
      <Card>
        <p className="text-sm font-semibold text-white/90">Audit Logs</p>
        <p className="mt-1 text-xs text-white/55">
          Live and historical operational events across websocket and trades.
        </p>
      </Card>
      <AdminSubnav />

      <AuditTable rows={rows} />
    </div>
  );
}

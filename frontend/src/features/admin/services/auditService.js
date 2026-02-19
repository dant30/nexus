const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toTimeLabel = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const buildAuditRows = ({ trades = [], accounts = [], ws = null } = {}) => {
  const accountMap = new Map((accounts || []).map((acc) => [Number(acc.id), acc]));
  const tradeRows = (Array.isArray(trades) ? trades : []).map((trade) => {
    const ts = trade.updated_at || trade.created_at;
    const account = accountMap.get(Number(trade.account_id));
    const profit = toNumber(trade.profit, 0);
    const status = String(trade.status || "").toUpperCase();
    return {
      id: `trade-${trade.id}-${ts || "na"}`,
      timestamp: ts || new Date().toISOString(),
      timeLabel: toTimeLabel(ts),
      level: status.includes("FAIL") || status.includes("REJECT") ? "ERROR" : "INFO",
      category: "trade",
      accountLabel: account?.deriv_account_id || trade.account_id || "-",
      message: `Trade ${trade.id} ${status || "UPDATED"}`,
      meta: `${trade.symbol || trade.underlying || "R_50"} | P/L ${profit.toFixed(2)}`,
    };
  });

  const wsRow = ws
    ? [
        {
          id: "ws-status",
          timestamp: new Date().toISOString(),
          timeLabel: toTimeLabel(new Date().toISOString()),
          level: ws.connected ? "INFO" : "WARN",
          category: "websocket",
          accountLabel: "-",
          message: ws.connected ? "Realtime connection healthy" : "Realtime connection unstable",
          meta: `Reconnect attempts: ${toNumber(ws.reconnectAttempts, 0)}`,
        },
      ]
    : [];

  return [...wsRow, ...tradeRows]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 200);
};

export const createLiveAuditRow = ({ type = "event", payload = {} } = {}) => {
  const now = new Date().toISOString();
  return {
    id: `live-${type}-${Date.now()}`,
    timestamp: now,
    timeLabel: toTimeLabel(now),
    level: type === "ws_error" ? "ERROR" : "INFO",
    category: type,
    accountLabel: payload.account_id || "-",
    message: payload.message || `Live ${type} event received`,
    meta: payload.symbol || payload.status || "-",
  };
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toRoleLabel = (user) => {
  const role = String(user?.role || user?.user_type || "").toLowerCase();
  if (user?.is_superuser || role === "superadmin") return "superadmin";
  if (user?.is_admin || user?.is_staff || role === "admin") return "admin";
  return role || "user";
};

export const buildUserRows = ({ user = null, accounts = [], trades = [] } = {}) => {
  const tradeRows = Array.isArray(trades) ? trades : [];
  const accountRows = Array.isArray(accounts) ? accounts : [];

  const won = tradeRows.filter((trade) => toNumber(trade.profit, 0) > 0).length;
  const closed = tradeRows.filter((trade) => String(trade.status || "").toUpperCase() !== "OPEN");
  const netProfit = closed.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
  const currency = accountRows[0]?.currency || "USD";

  const currentUser = user
    ? {
        id: toNumber(user.id, 0) || 1,
        name:
          user.deriv_full_name?.trim() ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username ||
          "User",
        username: user.username || "-",
        email: user.email || "-",
        role: toRoleLabel(user),
        isActive: true,
        accountCount: accountRows.length,
        totalTrades: closed.length,
        winRate: closed.length ? (won / closed.length) * 100 : 0,
        netProfit,
        currency,
      }
    : null;

  return currentUser ? [currentUser] : [];
};

export const buildAccountRows = ({ accounts = [], trades = [] } = {}) => {
  const tradeRows = Array.isArray(trades) ? trades : [];
  return (Array.isArray(accounts) ? accounts : []).map((account) => {
    const scoped = tradeRows.filter((trade) => Number(trade.account_id) === Number(account.id));
    const closed = scoped.filter((trade) => String(trade.status || "").toUpperCase() !== "OPEN");
    const wins = closed.filter((trade) => toNumber(trade.profit, 0) > 0).length;
    const pnl = closed.reduce((sum, trade) => sum + toNumber(trade.profit, 0), 0);
    return {
      id: account.id,
      accountLabel: account.deriv_account_id || account.id,
      currency: account.currency || "USD",
      type: account.account_type || "-",
      balance: toNumber(account.balance, 0),
      trades: closed.length,
      wins,
      winRate: closed.length ? (wins / closed.length) * 100 : 0,
      pnl,
      isDefault: !!account.is_default,
    };
  });
};

export const buildCommissionRows = ({ trades = [], accounts = [] } = {}) => {
  const accountMap = new Map((accounts || []).map((acc) => [Number(acc.id), acc]));
  const rows = (Array.isArray(trades) ? trades : [])
    .filter((trade) => String(trade.status || "").toUpperCase() !== "OPEN")
    .map((trade) => {
      const ts = trade.updated_at || trade.created_at;
      const account = accountMap.get(Number(trade.account_id));
      return {
        id: trade.id,
        time: ts
          ? new Date(ts).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
        accountLabel: account?.deriv_account_id || trade.account_id || "-",
        symbol: trade.symbol || trade.underlying || "R_50",
        stake: toNumber(trade.stake, 0),
        commission: toNumber(trade.commission_applied, 0),
        profit: toNumber(trade.profit, 0),
        status: trade.status || "-",
      };
    })
    .sort((a, b) => (a.time < b.time ? 1 : -1));

  const totals = rows.reduce(
    (acc, row) => ({
      commission: acc.commission + row.commission,
      profit: acc.profit + row.profit,
    }),
    { commission: 0, profit: 0 }
  );

  return { rows: rows.slice(0, 60), totals };
};

export const buildSymbolPerformance = ({ trades = [] } = {}) => {
  const grouped = new Map();
  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const symbol = trade.symbol || trade.underlying || "UNKNOWN";
    const status = String(trade.status || "").toUpperCase();
    if (status === "OPEN") return;
    if (!grouped.has(symbol)) {
      grouped.set(symbol, { symbol, trades: 0, wins: 0, losses: 0, pnl: 0 });
    }
    const row = grouped.get(symbol);
    const profit = toNumber(trade.profit, 0);
    row.trades += 1;
    row.pnl += profit;
    if (profit > 0) row.wins += 1;
    if (profit < 0) row.losses += 1;
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      winRate: row.trades > 0 ? (row.wins / row.trades) * 100 : 0,
    }))
    .sort((a, b) => b.trades - a.trades);
};

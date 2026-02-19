import { apiClient } from "../../../core/api/client.js";
import { API_ENDPOINTS } from "../../../core/constants/api.js";

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toRoleLabel = (role = "") => {
  const token = String(role || "").toLowerCase();
  if (token === "superadmin") return "superadmin";
  if (token === "admin") return "admin";
  return "user";
};

export const getAdminOverview = async () => {
  const data = await apiClient.get(API_ENDPOINTS.ADMIN.OVERVIEW);
  return {
    users: toNumber(data?.users, 0),
    accounts: toNumber(data?.accounts, 0),
    openTrades: toNumber(data?.open_trades, 0),
    closedTrades: toNumber(data?.closed_trades, 0),
    winRate: toNumber(data?.win_rate, 0),
    netProfit: toNumber(data?.net_profit, 0),
    roi: toNumber(data?.roi, 0),
  };
};

export const getAdminUsers = async ({ search = "", limit = 50, offset = 0 } = {}) => {
  const data = await apiClient.get(
    `${API_ENDPOINTS.ADMIN.USERS}${buildQuery({ search, limit, offset })}`
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: toNumber(data?.total, 0),
    rows: items.map((row) => ({
      id: row.id,
      name: row.name || row.username || "User",
      username: row.username || "-",
      email: row.email || "-",
      role: toRoleLabel(row.role),
      isActive: !!row.is_active,
      accountCount: toNumber(row.account_count, 0),
      totalTrades: toNumber(row.closed_trades, toNumber(row.total_trades, 0)),
      winRate: toNumber(row.win_rate, 0),
      netProfit: toNumber(row.net_profit, 0),
      currency: Array.isArray(row.currencies) && row.currencies.length ? row.currencies[0] : "USD",
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    })),
  };
};

export const getAdminAccounts = async ({ search = "", limit = 80, offset = 0 } = {}) => {
  const data = await apiClient.get(
    `${API_ENDPOINTS.ADMIN.ACCOUNTS}${buildQuery({ search, limit, offset })}`
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: toNumber(data?.total, 0),
    rows: items.map((row) => ({
      id: row.id,
      accountLabel: row.account_id || row.id,
      type: row.account_type || "-",
      currency: row.currency || "USD",
      balance: toNumber(row.balance, 0),
      trades: toNumber(row.closed_trades, toNumber(row.trades, 0)),
      wins: toNumber(row.wins, 0),
      losses: toNumber(row.losses, 0),
      winRate: toNumber(row.win_rate, 0),
      pnl: toNumber(row.net_profit, 0),
      isDefault: !!row.is_default,
      userId: row.user_id,
      userUsername: row.user_username || "-",
      userEmail: row.user_email || "-",
      recoveryActive: !!row.recovery_active,
      recoveryLevel: toNumber(row.recovery_level, 0),
    })),
  };
};

export const getAdminAnalytics = async ({ days = 30 } = {}) => {
  const data = await apiClient.get(`${API_ENDPOINTS.ADMIN.ANALYTICS}${buildQuery({ days })}`);
  const summary = data?.summary || {};
  return {
    summary: {
      closedTrades: toNumber(summary.closed_trades, 0),
      openTrades: toNumber(summary.open_trades, 0),
      winRate: toNumber(summary.win_rate, 0),
      pnl: toNumber(summary.net_profit, 0),
    },
    accounts: Array.isArray(data?.accounts)
      ? data.accounts.map((row) => ({
          id: row.id,
          accountLabel: row.account_label || row.id,
          type: row.account_type || "-",
          currency: row.currency || "USD",
          balance: toNumber(row.balance, 0),
          trades: toNumber(row.trades, 0),
          wins: toNumber(row.wins, 0),
          losses: toNumber(row.losses, 0),
          winRate: toNumber(row.win_rate, 0),
          pnl: toNumber(row.pnl, 0),
        }))
      : [],
    symbols: Array.isArray(data?.symbols)
      ? data.symbols.map((row) => ({
          symbol: row.symbol || "UNKNOWN",
          trades: toNumber(row.trades, 0),
          wins: toNumber(row.wins, 0),
          losses: toNumber(row.losses, 0),
          winRate: toNumber(row.win_rate, 0),
          pnl: toNumber(row.pnl, 0),
        }))
      : [],
    windowDays: toNumber(data?.window_days, days),
  };
};

export const getAdminCommissions = async ({ limit = 100 } = {}) => {
  const data = await apiClient.get(`${API_ENDPOINTS.ADMIN.COMMISSIONS}${buildQuery({ limit })}`);
  const totals = data?.totals || {};
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: toNumber(data?.total, 0),
    totals: {
      commission: toNumber(totals.commission, 0),
      profit: toNumber(totals.profit, 0),
    },
    rows: items.map((row) => ({
      id: row.id,
      time: row.time,
      accountLabel: row.account_label || row.account_id || "-",
      accountId: row.account_id,
      username: row.username || "-",
      symbol: row.symbol || "UNKNOWN",
      stake: toNumber(row.stake, 0),
      commission: toNumber(row.commission, 0),
      profit: toNumber(row.profit, 0),
      status: row.status || "-",
      currency: row.currency || "USD",
    })),
  };
};

export const getAdminSystemSettings = async () => {
  const data = await apiClient.get(API_ENDPOINTS.ADMIN.SETTINGS);
  const trading = data?.trading || {};
  const risk = data?.risk || {};
  return {
    trading: {
      recoveryMode: String(trading.recoveryMode || "FIBONACCI").toUpperCase(),
      recoveryMultiplier: toNumber(trading.recoveryMultiplier, 1.6),
      minSignalConfidence: toNumber(trading.minSignalConfidence, 0.7),
    },
    risk: {
      dailyLossLimit: toNumber(risk.dailyLossLimit, 50),
      maxConsecutiveLosses: toNumber(risk.maxConsecutiveLosses, 5),
      maxStakePercent: toNumber(risk.maxStakePercent, 5),
    },
  };
};

export const updateAdminSystemSettings = async ({ trading, risk } = {}) => {
  const payload = {
    trading: {
      recoveryMode: String(trading?.recoveryMode || "FIBONACCI").toUpperCase(),
      recoveryMultiplier: toNumber(trading?.recoveryMultiplier, 1.6),
      minSignalConfidence: toNumber(trading?.minSignalConfidence, 0.7),
    },
    risk: {
      dailyLossLimit: toNumber(risk?.dailyLossLimit, 50),
      maxConsecutiveLosses: Math.max(1, Math.round(toNumber(risk?.maxConsecutiveLosses, 5))),
      maxStakePercent: toNumber(risk?.maxStakePercent, 5),
    },
  };
  const data = await apiClient.put(API_ENDPOINTS.ADMIN.SETTINGS, payload);
  return data?.settings || payload;
};

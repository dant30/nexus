import { apiClient } from "../../../core/api/client.js";
import { API_ENDPOINTS } from "../../../core/constants/api.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const getAdminAudit = async ({ limit = 120 } = {}) => {
  const data = await apiClient.get(`${API_ENDPOINTS.ADMIN.AUDIT}${buildQuery({ limit })}`);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    total: toNumber(data?.total, 0),
    rows: items.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      timeLabel: row.timestamp
        ? new Date(row.timestamp).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "-",
      level: row.level || "INFO",
      category: row.category || "event",
      accountLabel: row.account_label || "-",
      message: row.message || "-",
      meta: row.meta || "-",
      user: row.user || "-",
    })),
  };
};


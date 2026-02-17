export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const formatMoney = (value, currency = "USD") =>
  `${toNumber(value, 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`.trim();

export const getAccountTypeLabel = (value = "") => {
  const raw = String(value).toLowerCase();
  if (raw.includes("virtual") || raw.includes("demo")) return "Virtual";
  if (raw.includes("real")) return "Real";
  return value || "Unknown";
};


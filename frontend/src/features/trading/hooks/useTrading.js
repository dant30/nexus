import { useCallback, useState } from "react";
import { executeTrade } from "../services/tradingService.js";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { TRADING } from "../../../core/constants/trading.js";

const normalizeError = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const detail = data?.error?.message || data?.detail || data?.message;
  const code = data?.error?.code || data?.code;

  if (status === 401) return "Session expired. Please log in again.";
  if (status === 404 && detail) return detail;
  if (status === 502 && detail) return detail;
  if (status === 400 && detail) {
    const lower = detail.toLowerCase();
    if (lower.includes("minimum stake")) return detail;
    if (lower.includes("insufficient balance")) return detail;
    if (lower.includes("not open")) return detail;
    return detail;
  }

  if (code === "VALIDATION_ERROR") return detail || "Validation error.";
  if (code === "UNAUTHORIZED") return "Session expired. Please log in again.";
  if (code === "NOT_FOUND") return detail || "Resource not found.";
  if (code === "INTERNAL_SERVER_ERROR") return "Server error. Please try again.";

  return detail || error?.message || "Unable to execute trade.";
};

export const useTrading = () => {
  const { activeAccount } = useAccountContext();
  const { refresh } = useTradingContext() || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastTrade, setLastTrade] = useState(null);

  const execute = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const selectedTradeType = payload?.trade_type ?? payload?.tradeType;
        const selectedContract = payload?.contract;

        if (selectedTradeType) {
          const allowedTradeTypes = new Set(TRADING.TRADE_TYPES.map((type) => type.value));
          if (!allowedTradeTypes.has(selectedTradeType)) {
            throw new Error("Invalid trade type.");
          }

          const allowedContracts =
            TRADING.TRADE_TYPE_CONTRACTS[selectedTradeType]?.map((option) => option.value) || [];
          if (!allowedContracts.includes(selectedContract)) {
            throw new Error(
              selectedTradeType === "RISE_FALL"
                ? "For Rise/Fall, contract must be Rise or Fall."
                : "For Call/Put, contract must be Call or Put."
            );
          }
        }

        const normalizedPayload = {
          duration_seconds: 300,
          ...payload,
          ...(selectedTradeType
            ? {
                trade_type: selectedTradeType,
                contract: selectedContract,
              }
            : {}),
          stake: payload?.stake ?? TRADING.DEFAULT_STAKE,
          account_id: payload?.account_id ?? activeAccount?.id,
        };

        if (selectedTradeType) {
          delete normalizedPayload.direction;
          delete normalizedPayload.contract_type;
        }

        const data = await executeTrade(normalizedPayload);
        const normalizedData = {
          ...data,
          trade_type: data?.trade_type || selectedTradeType || null,
          contract: data?.contract || selectedContract || null,
        };

        setLastTrade(normalizedData);
        if (refresh) {
          refresh();
        }
        return { ok: true, data: normalizedData };
      } catch (err) {
        const message = normalizeError(err);
        setError(message);
        return { ok: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [activeAccount?.id, refresh]
  );

  return { execute, loading, error, lastTrade };
};

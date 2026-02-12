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
  return detail || "Trade execution failed.";
};

export const useTrading = () => {
  const { activeAccount } = useAccountContext();
  const { setTrades, setOpenTrades } = useTradingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (payload) => {
      if (!activeAccount?.id) {
        setError("No active account selected.");
        return { success: false, error: "No active account" };
      }

      setLoading(true);
      setError(null);

      try {
        // Validate payload
        if (!payload.stake || payload.stake < TRADING.MIN_STAKE) {
          const err = `Minimum stake: $${TRADING.MIN_STAKE}`;
          setError(err);
          return { success: false, error: err };
        }

        if (!payload.contract_type || !payload.direction) {
          const err = "Invalid contract type or direction.";
          setError(err);
          return { success: false, error: err };
        }

        // Execute trade
        const result = await executeTrade({
          ...payload,
          account_id: activeAccount.id,
        });

        if (result?.success || result?.id) {
          setError(null);
          // Refresh trade lists
          setTrades((prev) => [result, ...prev]);
          if (result.status === "OPEN") {
            setOpenTrades((prev) => [result, ...prev]);
          }
          return { success: true, ...result };
        } else {
          const errMsg = normalizeError(result);
          setError(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (err) {
        const errMsg = normalizeError(err);
        setError(errMsg);
        console.error("Trade execution error:", err);
        return { success: false, error: errMsg };
      } finally {
        setLoading(false);
      }
    },
    [activeAccount?.id, setTrades, setOpenTrades]
  );

  return { execute, loading, error };
};

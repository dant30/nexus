import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { listOpenTrades, listTrades } from "../services/tradingService.js";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";

const TradingContext = createContext(null);

const normalizeTradeShape = (trade = {}) => {
  const direction = String(trade.direction || "").toUpperCase();
  const contractType = String(trade.contract_type || "").toUpperCase();
  const explicitTradeType = String(trade.trade_type || "").toUpperCase();
  const explicitContract = String(trade.contract || "").toUpperCase();
  const contractLooksLikeCallPut =
    explicitContract === "CALL" ||
    explicitContract === "PUT" ||
    contractType === "CALL" ||
    contractType === "PUT";

  const inferredTradeType =
    explicitTradeType === "RISE_FALL" || explicitTradeType === "CALL_PUT"
      ? explicitTradeType
      : contractLooksLikeCallPut
        ? "CALL_PUT"
        : "RISE_FALL";

  let inferredContract = explicitContract;
  if (!inferredContract) {
    if (inferredTradeType === "CALL_PUT") {
      inferredContract = contractType === "PUT" ? "PUT" : "CALL";
    } else {
      inferredContract = direction === "FALL" ? "FALL" : "RISE";
    }
  }

  return {
    ...trade,
    trade_type: inferredTradeType,
    contract: inferredContract,
  };
};

export function TradingProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeframeSeconds, setTimeframeSeconds] = useState(() => {
    const saved = Number(localStorage.getItem("nexus:trading:timeframe"));
    return saved > 0 ? saved : 60;
  });
  const [signalsTimeframeSeconds, setSignalsTimeframeSeconds] = useState(() => {
    const saved = Number(localStorage.getItem("nexus:trading:signals_timeframe"));
    return saved >= 0 ? saved : 0;
  });
  const { isAuthenticated } = useAuth();

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setTrades([]);
      setOpenTrades([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [allTrades, open] = await Promise.all([
        listTrades({ limit: 50 }).catch(() => []),
        listOpenTrades().catch(() => []),
      ]);
      setTrades((allTrades || []).map(normalizeTradeShape));
      setOpenTrades((open || []).map(normalizeTradeShape));
    } catch (err) {
      setError(err?.message || "Unable to load trades.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem("nexus:trading:timeframe", String(timeframeSeconds));
  }, [timeframeSeconds]);

  useEffect(() => {
    localStorage.setItem(
      "nexus:trading:signals_timeframe",
      String(signalsTimeframeSeconds)
    );
  }, [signalsTimeframeSeconds]);

  return (
    <TradingContext.Provider
      value={{
        trades,
        setTrades,
        openTrades,
        setOpenTrades,
        loading,
        error,
        refresh,
        timeframeSeconds,
        setTimeframeSeconds,
        signalsTimeframeSeconds,
        setSignalsTimeframeSeconds,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export const useTradingContext = () => useContext(TradingContext);

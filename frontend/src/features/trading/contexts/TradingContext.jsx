import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { listOpenTrades, listTrades } from "../services/tradingService.js";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      setTrades(allTrades || []);
      setOpenTrades(open || []);
    } catch (err) {
      setError(err?.message || "Unable to load trades.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export const useTradingContext = () => useContext(TradingContext);

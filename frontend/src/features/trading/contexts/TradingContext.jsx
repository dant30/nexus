import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { listOpenTrades, listTrades } from "../services/tradingService.js";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";

const TradingContext = createContext(null);

const TERMINAL_STATUSES = new Set(["WON", "LOST", "FAILED", "CANCELLED", "REJECTED", "ERROR"]);

const normalizeTradeShape = (trade = {}) => {
  const direction = String(trade.direction || "").toUpperCase();
  const contractType = String(trade.contract_type || "").toUpperCase();
  const explicitTradeType = String(trade.trade_type || "").toUpperCase();
  const explicitContract = String(trade.contract || "").toUpperCase();
  const status = String(trade.status || "").toUpperCase();
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
    status,
    trade_type: inferredTradeType,
    contract: inferredContract,
  };
};

const mergeTrade = (existing = {}, incoming = {}) => {
  const next = {
    ...existing,
    ...incoming,
    id: incoming.id ?? existing.id,
    stake: incoming.stake ?? existing.stake,
    payout: incoming.payout ?? existing.payout,
    profit: incoming.profit ?? existing.profit,
    status: incoming.status ?? existing.status,
    symbol:
      incoming.symbol ||
      existing.symbol ||
      incoming.underlying ||
      existing.underlying ||
      incoming.shortcode ||
      existing.shortcode,
    updated_at: incoming.updated_at || new Date().toISOString(),
    created_at: existing.created_at || incoming.created_at || new Date().toISOString(),
  };
  return normalizeTradeShape(next);
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
  const { onMessage } = useWebSocket();
  const refreshTimerRef = useRef(null);

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
        listTrades({ limit: 100 }).catch(() => []),
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
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        refresh();
      }, 1200);
    };

    const offTradeStatus = onMessage("trade_status", (payload, message) => {
      const evt = payload || message || {};
      const tradeId = Number(evt.trade_id ?? evt.id ?? 0);
      if (!tradeId) return;

      const incoming = normalizeTradeShape({
        id: tradeId,
        status: evt.status,
        proposal_id: evt.proposal_id,
        transaction_id: evt.transaction_id,
        stake: evt.stake,
        payout: evt.payout,
        symbol: evt.symbol,
      });

      setTrades((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex((trade) => Number(trade.id) === tradeId);
        if (idx >= 0) {
          list[idx] = mergeTrade(list[idx], incoming);
          return list;
        }
        return [mergeTrade({}, incoming), ...list].slice(0, 200);
      });

      const isTerminal = TERMINAL_STATUSES.has(String(incoming.status || "").toUpperCase());
      setOpenTrades((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex((trade) => Number(trade.id) === tradeId);

        if (isTerminal) {
          if (idx >= 0) list.splice(idx, 1);
          return list;
        }

        if (idx >= 0) {
          list[idx] = mergeTrade(list[idx], incoming);
          return list;
        }

        return [mergeTrade({}, incoming), ...list].slice(0, 100);
      });

      if (isTerminal) {
        scheduleRefresh();
      }
    });

    return () => {
      offTradeStatus?.();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [onMessage, refresh]);

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

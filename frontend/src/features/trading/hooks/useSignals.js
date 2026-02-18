import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { getSignals } from "../services/signalService.js";

const DEFAULT_SIGNAL_SYMBOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"];
const DEFAULT_REFRESH_MS = 3200;

const toSignalKey = (signal = {}) =>
  signal.id ||
  `${signal.symbol || "UNK"}-${signal.timeframe || "1m"}-${signal.direction || "NEUTRAL"}-${
    signal.source || "engine"
  }`;

const mergeSignals = (incoming, previous = []) => {
  const merged = [...incoming, ...previous];
  const seen = new Set();
  return merged.filter((signal) => {
    const key = toSignalKey(signal);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const useSignals = ({
  liveMonitor = false,
  symbols = DEFAULT_SIGNAL_SYMBOLS,
  intervalSeconds = 60,
  refreshMs = DEFAULT_REFRESH_MS,
} = {}) => {
  const { onMessage, connected, sendMessage } = useWebSocket();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizedSymbols = useMemo(() => {
    const list = Array.isArray(symbols) ? symbols : DEFAULT_SIGNAL_SYMBOLS;
    const unique = [...new Set(list.filter(Boolean))];
    return unique.length ? unique : DEFAULT_SIGNAL_SYMBOLS;
  }, [symbols]);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSignals();
      setSignals((prev) => mergeSignals(Array.isArray(data) ? data : [], prev));
      return data;
    } catch (err) {
      setError(err?.message || "Unable to load signals.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  useEffect(() => {
    if (!connected) return;

    const offSignal = onMessage("signal", (payload, message) => {
      const raw = payload?.signal || payload || message;
      if (!raw) return;
      const normalized = Array.isArray(raw) ? raw : [raw];
      setSignals((prev) => mergeSignals(normalized, prev));
    });

    const offSignals = onMessage("signals", (payload, message) => {
      const raw = payload?.signals || payload || message;
      if (!raw) return;
      const normalized = Array.isArray(raw) ? raw : [raw];
      setSignals((prev) => mergeSignals(normalized, prev));
    });

    return () => {
      offSignal?.();
      offSignals?.();
    };
  }, [connected, onMessage]);

  useEffect(() => {
    if (!connected || !liveMonitor) return;

    const interval = Math.max(60, Number(intervalSeconds) || 60);
    const snapshot = () => sendMessage("signals_snapshot");

    normalizedSymbols.forEach((symbol) => {
      sendMessage("subscribe", { symbol, interval });
    });

    snapshot();
    const timer = setInterval(snapshot, Math.max(1500, Number(refreshMs) || DEFAULT_REFRESH_MS));

    return () => {
      clearInterval(timer);
    };
  }, [connected, liveMonitor, normalizedSymbols, intervalSeconds, refreshMs, sendMessage]);

  return { signals, loading, error, fetchSignals };
};

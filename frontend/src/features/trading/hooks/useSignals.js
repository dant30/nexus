import { useCallback, useEffect, useState } from "react";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { getSignals } from "../services/signalService.js";

export const useSignals = () => {
  const { onMessage, connected } = useWebSocket();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSignals();
      setSignals(data);
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
      setSignals((prev) => {
        const merged = [...normalized, ...prev];
        const seen = new Set();
        return merged.filter((signal) => {
          const key = signal.id || `${signal.symbol}-${signal.timeframe}-${signal.direction}-${signal.source}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    });

    const offSignals = onMessage("signals", (payload, message) => {
      const raw = payload?.signals || payload || message;
      if (!raw) return;
      setSignals(Array.isArray(raw) ? raw : [raw]);
    });

    return () => {
      offSignal?.();
      offSignals?.();
    };
  }, [connected, onMessage]);

  return { signals, loading, error, fetchSignals };
};

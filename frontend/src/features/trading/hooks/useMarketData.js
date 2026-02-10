import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../../../providers/WSProvider.jsx";

const MAX_TICKS = 360;
const MAX_CANDLES = 120;

const buildCandles = (ticks, interval) => {
  if (!ticks?.length) return [];
  const buckets = new Map();

  ticks.forEach((tick) => {
    const time = Number(tick.time);
    if (!time) return;
    const bucketKey = Math.floor(time / interval) * interval;
    const price = Number(tick.price);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        time: bucketKey,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } else {
      const candle = buckets.get(bucketKey);
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
    }
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .slice(-MAX_CANDLES);
};

export const useMarketData = (symbol, timeframeSeconds = 60) => {
  const { subscribeTick, unsubscribeTick, onMessage, connected, sendMessage } = useWebSocket();
  const [ticks, setTicks] = useState([]);
  const [candles, setCandles] = useState([]);
  const [error, setError] = useState(null);

  const handleTick = useCallback(
    (payload, message) => {
      const raw = payload?.tick || payload || message;
      if (!raw?.symbol || raw.symbol !== symbol) return;
      const nextTick = {
        symbol: raw.symbol,
        price: Number(raw.price ?? raw.quote ?? raw.ask ?? 0),
        bid: raw.bid,
        ask: raw.ask,
        time: Number(raw.time ?? raw.epoch ?? Math.floor(Date.now() / 1000)),
      };
      if (!nextTick.price) return;
      setTicks((prev) => [...prev, nextTick].slice(-MAX_TICKS));
    },
    [symbol]
  );

  const handleCandle = useCallback(
    (payload, message) => {
      const raw = payload?.candle || payload || message;
      if (Array.isArray(raw)) {
        const normalized = raw
          .filter((entry) => entry?.symbol === symbol)
          .map((entry) => ({
            symbol: entry.symbol,
            time: Number(entry.time ?? entry.epoch ?? Math.floor(Date.now() / 1000)),
            open: Number(entry.open ?? entry.price ?? 0),
            high: Number(entry.high ?? entry.price ?? 0),
            low: Number(entry.low ?? entry.price ?? 0),
            close: Number(entry.close ?? entry.price ?? 0),
          }))
          .filter((entry) => entry.close);
        if (!normalized.length) return;
        setCandles(normalized.slice(-MAX_CANDLES));
        return;
      }
      if (!raw?.symbol || raw.symbol !== symbol) return;
      const candle = {
        symbol: raw.symbol,
        time: Number(raw.time ?? raw.epoch ?? Math.floor(Date.now() / 1000)),
        open: Number(raw.open ?? raw.price ?? 0),
        high: Number(raw.high ?? raw.price ?? 0),
        low: Number(raw.low ?? raw.price ?? 0),
        close: Number(raw.close ?? raw.price ?? 0),
      };
      if (!candle.close) return;
      setCandles((prev) => [...prev, candle].slice(-MAX_CANDLES));
    },
    [symbol]
  );

  useEffect(() => {
    if (!symbol || !connected) return;
    const interval = timeframeSeconds || 60;
    subscribeTick(symbol, { interval });
    sendMessage("market_snapshot", { symbol, interval });
    const offTick = onMessage("tick", handleTick);
    const offCandles = onMessage("candles", handleCandle);
    const offCandle = onMessage("candle", handleCandle);

    return () => {
      unsubscribeTick(symbol, { interval });
      offTick?.();
      offCandles?.();
      offCandle?.();
    };
  }, [
    symbol,
    timeframeSeconds,
    connected,
    subscribeTick,
    unsubscribeTick,
    onMessage,
    handleTick,
    handleCandle,
  ]);

  useEffect(() => {
    setTicks([]);
    setCandles([]);
  }, [symbol, timeframeSeconds]);

  const fallbackCandles = useMemo(
    () => buildCandles(ticks, timeframeSeconds || 60),
    [ticks, timeframeSeconds]
  );
  const data = useMemo(
    () => ({ symbol, ticks, candles: candles.length ? candles : fallbackCandles }),
    [symbol, ticks, candles, fallbackCandles]
  );

  return { data, loading: !connected, error };
};

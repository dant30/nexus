import { wsManager } from "../../../core/ws/wsManager.js";

export const getMarketData = async (symbol) => {
  if (!symbol) {
    return { symbol, candles: [], ticks: [] };
  }

  if (!wsManager.isConnected()) {
    return { symbol, candles: [], ticks: [] };
  }

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      off?.();
      resolve({ symbol, candles: [], ticks: [] });
    }, 4000);

    const off = wsManager.on("candles", (data) => {
      if (settled) return;
      const payload = Array.isArray(data) ? data : data?.candles ?? [];
      const filtered = Array.isArray(payload)
        ? payload.filter((candle) => candle?.symbol === symbol)
        : [];
      if (!filtered.length) return;
      settled = true;
      clearTimeout(timeout);
      off?.();
      resolve({ symbol, candles: filtered, ticks: [] });
    });

    wsManager.send("market_snapshot", { symbol });
  });
};

export const subscribeMarket = (symbol) => wsManager.subscribeTicks(symbol);
export const unsubscribeMarket = (symbol) => wsManager.unsubscribeTicks(symbol);
export const onMarketTick = (handler) => wsManager.on("tick", handler);

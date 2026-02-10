import { wsManager } from "../../../core/ws/wsManager.js";

export const getMarketData = async (symbol) => {
  if (!symbol) {
    return { symbol, candles: [], ticks: [] };
  }

  // Request a snapshot if the backend supports it.
  wsManager.send("market_snapshot", { symbol });
  return { symbol, candles: [], ticks: [] };
};

export const subscribeMarket = (symbol) => wsManager.subscribeTicks(symbol);
export const unsubscribeMarket = (symbol) => wsManager.unsubscribeTicks(symbol);
export const onMarketTick = (handler) => wsManager.on("tick", handler);

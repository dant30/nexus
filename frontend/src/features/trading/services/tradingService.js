import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const listTrades = async (options = {}) => {
  const { limit = 50 } = options;
  const { data } = await client.get(API_ENDPOINTS.TRADES.LIST, {
    params: { limit },
  });
  return data;
};

export const listOpenTrades = async () => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.OPEN);
  return data;
};

export const getTrade = async (tradeId) => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.GET(tradeId));
  return data;
};

export const closeTrade = async (tradeId) => {
  const { data } = await client.post(API_ENDPOINTS.TRADES.CLOSE(tradeId));
  return data;
};

export const getStats = async () => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.STATS);
  return data;
};

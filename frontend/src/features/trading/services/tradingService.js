import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const executeTrade = async (payload) => {
  const { data } = await client.post(API_ENDPOINTS.TRADES.EXECUTE, payload);
  return data;
};

export const closeTrade = async (id, payload) => {
  const { data } = await client.post(API_ENDPOINTS.TRADES.CLOSE(id), payload);
  return data;
};

export const listTrades = async (params = {}) => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.LIST, { params });
  return data;
};

export const listOpenTrades = async () => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.OPEN);
  return data;
};

export const getTrade = async (id) => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.GET(id));
  return data;
};

export const getTradeProfit = async (id) => {
  const { data } = await client.get(API_ENDPOINTS.TRADES.PROFIT(id));
  return data;
};

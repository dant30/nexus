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
  const { data } = await client.post(`${API_ENDPOINTS.TRADES.LIST}/${id}/close`, payload);
  return data;
};

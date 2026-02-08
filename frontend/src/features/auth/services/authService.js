import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const loginRequest = async (payload) => {
  const { data } = await client.post(API_ENDPOINTS.AUTH.LOGIN, payload);
  return data;
};

export const logoutRequest = async () => {
  const { data } = await client.post(API_ENDPOINTS.AUTH.LOGOUT);
  return data;
};

export const refreshRequest = async (payload) => {
  const { data } = await client.post(API_ENDPOINTS.AUTH.REFRESH, payload);
  return data;
};

export const getOAuthUrl = async () => {
  const { data } = await client.get(`${API_ENDPOINTS.AUTH.LOGIN.replace("/login", "")}/oauth/deriv/authorize`);
  return data;
};

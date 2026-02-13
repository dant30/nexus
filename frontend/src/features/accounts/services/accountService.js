import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const listAccounts = async () => {
  const { data } = await client.get(API_ENDPOINTS.ACCOUNTS.LIST);
  return data;
};

export const getDefaultAccount = async () => {
  const { data } = await client.get(API_ENDPOINTS.ACCOUNTS.DEFAULT);
  return data;
};

export const getAccountBalance = async (accountId) => {
  const { data } = await client.get(API_ENDPOINTS.ACCOUNTS.BALANCE(accountId));
  return data;
};

export const getLiveBalance = async (accountId) => {
  const { data } = await client.get(API_ENDPOINTS.ACCOUNTS.BALANCE_LIVE(accountId));
  return data;
};

export const setDefaultAccount = async (accountId) => {
  const { data } = await client.put(API_ENDPOINTS.ACCOUNTS.SET_DEFAULT(accountId));
  return data;
};

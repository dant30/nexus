import axios from "axios";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { attachInterceptors } from "../../../core/api/interceptors.js";

const client = axios.create();
attachInterceptors(client);

export const listAccounts = async () => {
  const { data } = await client.get(API_ENDPOINTS.ACCOUNTS.LIST);
  return data;
};

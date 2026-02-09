import { apiClient } from "../../../core/api/client.js";
import { API_ENDPOINTS } from "../../../core/constants/api.js";

export const loginRequest = async (payload) => {
  return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, payload);
};

export const logoutRequest = async () => {
  return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
};

export const refreshRequest = async (payload) => {
  return apiClient.post(API_ENDPOINTS.AUTH.REFRESH, payload);
};

export const getOAuthUrl = async () => {
  return apiClient.get(API_ENDPOINTS.AUTH.OAUTH_AUTHORIZE);
};

export const handleOAuthCallback = async (payload) => {
  return apiClient.post(API_ENDPOINTS.AUTH.OAUTH_CALLBACK, payload);
};

export const fetchMeRequest = async () => {
  return apiClient.get(API_ENDPOINTS.AUTH.ME);
};
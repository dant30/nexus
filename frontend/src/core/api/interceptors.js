import AuthStorage from "../storage/auth.js";
import { apiClient } from "./client.js";

export const attachInterceptors = (client) => {
  client.interceptors.request.use(async (config) => {
    const nextConfig = { ...config, headers: { ...(config?.headers || {}) } };
    const accessToken = AuthStorage.getAccessToken();

    if (accessToken && apiClient.isTokenExpired(accessToken, 30)) {
      const refreshed = await apiClient.refreshAccessToken();
      if (refreshed) {
        nextConfig.headers.Authorization = `Bearer ${refreshed}`;
        return nextConfig;
      }
      return Promise.reject(new Error("Authentication failed"));
    }

    if (accessToken) {
      nextConfig.headers.Authorization = `Bearer ${accessToken}`;
    }

    return nextConfig;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err?.response?.status;
      const originalRequest = err?.config || {};

      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await apiClient.refreshAccessToken();
        if (newToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };
          return client(originalRequest);
        }

        AuthStorage.clear();
      }

      return Promise.reject(err);
    }
  );
};

import { authStorage } from "../storage/auth.js";

export const attachInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const auth = authStorage.get();
    if (auth?.access_token) {
      config.headers.Authorization = `Bearer ${auth.access_token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        authStorage.clear();
      }
      return Promise.reject(err);
    }
  );
};

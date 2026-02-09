import AuthStorage from "../storage/auth.js";

export const attachInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const accessToken = AuthStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        AuthStorage.clear();
      }
      return Promise.reject(err);
    }
  );
};

import { getOAuthUrl } from "../services/authService.js";

export const useOAuth = () => {
  const startOAuth = async () => {
    const { authorization_url } = await getOAuthUrl();
    window.location.href = authorization_url;
  };

  return { startOAuth };
};

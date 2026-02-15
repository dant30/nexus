import { apiClient } from "../../../core/api/client.js";
import { API_ENDPOINTS } from "../../../core/constants/api.js";

export const fetchAffiliateCode = async () => {
  return apiClient.get(API_ENDPOINTS.USERS.AFFILIATE_CODE);
};

export const fetchReferralStats = async () => {
  return apiClient.get(API_ENDPOINTS.USERS.AFFILIATE_STATS);
};

export const buildReferralLink = (code) => {
  if (!code) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/login?ref=${encodeURIComponent(code)}`;
};

import { apiClient } from "../../../core/api/client.js";
import { API_ENDPOINTS } from "../../../core/constants/api.js";
import { preferencesStorage } from "../../../core/storage/preferences.js";

const TRADING_PREFS_KEY = "settings.trading";
const RISK_PREFS_KEY = "settings.risk";

const DEFAULT_TRADING_PREFERENCES = {
  defaultStake: 5,
  minSignalConfidence: 0.7,
  cooldownSeconds: 10,
  maxTradesPerSession: 5,
  timeframeSeconds: 60,
  signalsTimeframeSeconds: 0,
};

const DEFAULT_RISK_SETTINGS = {
  dailyLossLimit: 50,
  maxConsecutiveLosses: 5,
  maxStakePercent: 5,
  stopOnHighRisk: true,
};

const readPreference = (key, defaults) => {
  const all = preferencesStorage.get();
  return {
    ...defaults,
    ...(all?.[key] || {}),
  };
};

const writePreference = (key, value) => {
  const all = preferencesStorage.get();
  preferencesStorage.set({
    ...all,
    [key]: value,
  });
  return value;
};

export const getUserProfile = async () => {
  return apiClient.get(API_ENDPOINTS.USERS.PROFILE);
};

export const updateUserProfile = async (payload) => {
  return apiClient.patch(API_ENDPOINTS.USERS.PROFILE, payload);
};

export const changePassword = async (payload) => {
  return apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, payload);
};

export const getBillingSummary = async () => {
  return apiClient.get(API_ENDPOINTS.BILLING.BALANCE);
};

export const getBillingTransactions = async (limit = 50) => {
  return apiClient.get(`${API_ENDPOINTS.BILLING.TRANSACTIONS}?limit=${limit}`);
};

export const getTradingPreferences = async () => {
  return readPreference(TRADING_PREFS_KEY, DEFAULT_TRADING_PREFERENCES);
};

export const saveTradingPreferences = async (payload) => {
  return writePreference(TRADING_PREFS_KEY, {
    ...DEFAULT_TRADING_PREFERENCES,
    ...(payload || {}),
  });
};

export const getRiskSettings = async () => {
  return readPreference(RISK_PREFS_KEY, DEFAULT_RISK_SETTINGS);
};

export const saveRiskSettings = async (payload) => {
  return writePreference(RISK_PREFS_KEY, {
    ...DEFAULT_RISK_SETTINGS,
    ...(payload || {}),
  });
};

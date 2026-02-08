import { executeTrade } from "../services/tradingService.js";

export const useTrading = () => {
  const execute = async (payload) => executeTrade(payload);
  return { execute };
};

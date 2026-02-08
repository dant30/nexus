import { getSignals } from "../services/signalService.js";

export const useSignals = () => {
  const fetchSignals = async () => getSignals();
  return { fetchSignals };
};

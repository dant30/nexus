import { startBot, stopBot } from "../services/botService.js";

export const useBot = () => {
  return {
    start: (payload) => startBot(payload),
    stop: () => stopBot(),
  };
};

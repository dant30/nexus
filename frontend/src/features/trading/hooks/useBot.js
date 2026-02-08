import { startBot, stopBot } from "../services/botService.js";

export const useBot = () => {
  return {
    start: () => startBot(),
    stop: () => stopBot()
  };
};

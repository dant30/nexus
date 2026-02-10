import { wsManager } from "../../../core/ws/wsManager.js";

export const getSignals = async () => {
  wsManager.send("signals_snapshot");
  return [];
};

export const onSignal = (handler) => wsManager.on("signal", handler);
export const onSignals = (handler) => wsManager.on("signals", handler);

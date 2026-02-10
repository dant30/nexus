import { wsManager } from "../../../core/ws/wsManager.js";

export const getSignals = async () => {
  if (!wsManager.isConnected()) {
    return [];
  }

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      off?.();
      resolve([]);
    }, 4000);

    const off = wsManager.on("signals", (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      off?.();
      const payload = data?.signals ?? data ?? [];
      resolve(Array.isArray(payload) ? payload : [payload]);
    });

    wsManager.send("signals_snapshot");
  });
};

export const onSignal = (handler) => wsManager.on("signal", handler);
export const onSignals = (handler) => wsManager.on("signals", handler);

import { useEffect, useRef } from "react";
import { WSManager } from "../core/ws/wsManager.js";

export const useWebSocket = (url, onMessage) => {
  const ref = useRef(null);

  useEffect(() => {
    const manager = new WSManager(url);
    manager.connect();
    if (onMessage) manager.on("message", onMessage);
    ref.current = manager;
    return () => {
      ref.current = null;
    };
  }, [url]);

  return ref;
};

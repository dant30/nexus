import { useCallback } from "react";
import { useNotifications } from "./useNotifications.js";

export const useToast = () => {
  const { pushToast, removeToast } = useNotifications();

  const show = useCallback((message, level = "info", options = {}) => {
    return pushToast({
      message,
      level,
      title: options.title,
      durationMs: options.durationMs,
    });
  }, [pushToast]);

  const success = useCallback((message, options = {}) => {
    return show(message, "success", options);
  }, [show]);

  const error = useCallback((message, options = {}) => {
    return show(message, "error", options);
  }, [show]);

  const info = useCallback((message, options = {}) => {
    return show(message, "info", options);
  }, [show]);

  const warning = useCallback((message, options = {}) => {
    return show(message, "warning", options);
  }, [show]);

  return { show, success, error, info, warning, removeToast };
};

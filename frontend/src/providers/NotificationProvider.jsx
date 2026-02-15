import React from "react";
import { NotificationProvider as CanonicalNotificationProvider } from "../features/notifications/contexts/NotificationContext.jsx";
import { useNotifications } from "../features/notifications/hooks/useNotifications.js";

/**
 * Compatibility shim:
 * Keeps legacy imports from `providers/NotificationProvider` working while
 * routing everything to the canonical notifications feature implementation.
 */
export function NotificationProvider({ children }) {
  return <CanonicalNotificationProvider>{children}</CanonicalNotificationProvider>;
}

export const useNotify = () => {
  const { pushToast, toasts, removeToast } = useNotifications();
  return {
    push: (msg, type = "info") => pushToast({ message: msg, level: type }),
    toasts,
    remove: removeToast,
  };
};

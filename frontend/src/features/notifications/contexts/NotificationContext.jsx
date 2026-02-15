import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchNotifications, markNotificationRead } from "../services/notificationService.js";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const { isAuthenticated } = useAuth();

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async (options = {}) => {
    if (!isAuthenticated) {
      setNotifications([]);
      return [];
    }
    const { silent = false, unreadOnly = false, limit = 50 } = options;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchNotifications({ unreadOnly, limit });
      setNotifications(data);
      return data;
    } catch (err) {
      setError(err?.message || "Unable to load notifications.");
      return [];
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Unable to mark notification as read." };
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((notification) => !notification.is_read);
    if (!unread.length) return { ok: true };
    try {
      await Promise.all(unread.map((notification) => markNotificationRead(notification.id)));
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Unable to mark all notifications as read." };
    }
  }, [notifications]);

  const pushToast = useCallback((payload) => {
    const id = Date.now() + Math.random();
    const next = typeof payload === "string" ? { message: payload, level: "info" } : payload;
    const toast = {
      id,
      message: next?.message || "Notification",
      level: next?.level || "info",
      title: next?.title || null,
      durationMs: next?.durationMs || 4000,
    };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, toast.durationMs);
    return id;
  }, []);

  const removeToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((item) => item.id !== toastId));
  }, []);

  useEffect(() => {
    loadNotifications({ unreadOnly: false, limit: 50 });
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true, unreadOnly: false, limit: 50 });
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, loadNotifications]);

  const value = useMemo(() => ({
    notifications,
    loading,
    error,
    unreadCount,
    toasts,
    setNotifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    pushToast,
    removeToast,
  }), [
    notifications,
    loading,
    error,
    unreadCount,
    toasts,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    pushToast,
    removeToast,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
};

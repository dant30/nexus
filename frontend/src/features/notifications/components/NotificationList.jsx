import React from "react";
import { Empty } from "../../../shared/components/ui/misc/Empty.jsx";
import { useNotifications } from "../hooks/useNotifications.js";

const levelClass = (level) => {
  const value = String(level || "info").toLowerCase();
  if (value === "error") return "text-rose-300";
  if (value === "warning") return "text-amber-300";
  if (value === "success") return "text-emerald-300";
  return "text-sky-300";
};

export function NotificationList({ compact = false, onItemClick }) {
  const { notifications, loading, markAsRead } = useNotifications();

  if (loading) {
    return <div className="text-xs text-white/50">Loading notifications...</div>;
  }

  if (!notifications.length) {
    return <Empty message="No notifications." />;
  }

  const rows = compact ? notifications.slice(0, 8) : notifications;

  const handleNotificationClick = (notification, e) => {
    // Don't trigger if clicking on the mark as read button
    if (e.target.closest('button')) return;
    
    // Call the parent's onItemClick if provided
    if (onItemClick) {
      onItemClick(notification);
    }
    
    // Auto-mark as read when clicked (optional - remove if you don't want this)
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const handleMarkAsRead = (e, id) => {
    e.stopPropagation(); // Prevent triggering the parent click
    markAsRead(id);
  };

  return (
    <div className="space-y-2">
      {rows.map((notification) => (
        <div
          key={notification.id}
          onClick={(e) => handleNotificationClick(notification, e)}
          className={`rounded-md border p-3 text-xs transition-all cursor-pointer ${
            notification.is_read
              ? "border-white/10 bg-slate-900/40 text-white/70 hover:bg-slate-800/60"
              : "border-accent/30 bg-accent/10 text-white/90 hover:bg-accent/15"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{notification.title}</p>
              <p className="mt-1 break-words text-white/70">{notification.body}</p>
              <p className={`mt-1 text-[11px] ${levelClass(notification.level)}`}>
                {String(notification.level || "info").toUpperCase()}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-white/40 whitespace-nowrap">
                {notification.created_at
                  ? new Date(notification.created_at).toLocaleString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      ...(compact ? {} : { month: 'short', day: 'numeric' })
                    })
                  : "-"}
              </p>
              {!notification.is_read && (
                <button
                  type="button"
                  onClick={(e) => handleMarkAsRead(e, notification.id)}
                  className="mt-2 rounded border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:border-accent/60 hover:text-accent hover:bg-white/5"
                  aria-label="Mark as read"
                >
                  Mark Read
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
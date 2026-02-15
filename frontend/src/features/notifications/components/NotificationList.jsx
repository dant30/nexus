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

export function NotificationList({ compact = false }) {
  const { notifications, loading, markAsRead } = useNotifications();

  if (loading) {
    return <div className="text-xs text-white/50">Loading notifications...</div>;
  }

  if (!notifications.length) {
    return <Empty message="No notifications." />;
  }

  const rows = compact ? notifications.slice(0, 8) : notifications;

  return (
    <div className="space-y-2">
      {rows.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-md border p-3 text-xs ${
            notification.is_read
              ? "border-white/10 bg-slate-900/40 text-white/70"
              : "border-accent/30 bg-accent/10 text-white/90"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{notification.title}</p>
              <p className="mt-1 break-words text-white/70">{notification.body}</p>
              <p className={`mt-1 text-[11px] ${levelClass(notification.level)}`}>
                {String(notification.level || "info").toUpperCase()}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-white/40">
                {notification.created_at
                  ? new Date(notification.created_at).toLocaleString()
                  : "-"}
              </p>
              {!notification.is_read ? (
                <button
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className="mt-2 rounded border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:border-accent/60 hover:text-accent"
                >
                  Mark Read
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

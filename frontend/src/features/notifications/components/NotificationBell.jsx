import React from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import { NotificationList } from "./NotificationList.jsx";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();

  return (
    <div className="group relative">
      <button
        type="button"
        className="relative inline-flex rounded-lg border border-white/10 p-2 text-white/70 transition-all hover:border-accent/40 hover:text-accent hover:bg-accent/5"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div className="invisible absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-white/10 bg-slate/98 p-3 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:visible group-hover:opacity-100">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-white/80">Notifications</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] text-accent transition hover:text-accent/80"
            >
              Mark all read
            </button>
            <Link to="/dashboard/notifications" className="text-[11px] text-white/60 hover:text-white/80">
              View all
            </Link>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <NotificationList compact />
        </div>
      </div>
    </div>
  );
}

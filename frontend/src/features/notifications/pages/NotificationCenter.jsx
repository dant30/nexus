import React from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { NotificationList } from "../components/NotificationList.jsx";
import { useNotifications } from "../hooks/useNotifications.js";

export function NotificationCenter() {
  const { unreadCount, loading, loadNotifications, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Notification Center</h2>
          <p className="text-sm text-white/60">
            Platform alerts, execution events, and account updates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadNotifications({ unreadOnly: false, limit: 50 })}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            Mark All Read
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Inbox</p>
          <span className="text-xs text-white/50">{unreadCount} unread</span>
        </div>
        <NotificationList />
      </Card>
    </div>
  );
}

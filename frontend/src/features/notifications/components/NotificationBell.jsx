import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import { NotificationList } from "./NotificationList.jsx";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex rounded-lg border border-white/10 p-2 text-white/70 transition-all hover:border-accent/40 hover:text-accent hover:bg-accent/5"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu - Mobile Optimized */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className={`
              absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 
              bg-slate-900 shadow-2xl ring-1 ring-black/60
              /* Mobile: fixed position at bottom */
              sm:absolute sm:right-0 sm:top-full sm:w-96
              fixed bottom-0 left-0 w-full sm:bottom-auto sm:left-auto
              rounded-t-xl sm:rounded-xl
              max-h-[80vh] sm:max-h-[600px]
              flex flex-col
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-slate-900">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    markAllAsRead();
                    setIsOpen(false);
                  }}
                  className="text-xs text-accent transition hover:text-accent/80"
                >
                  Mark all read
                </button>
                {/* Close button - visible on mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-white/60 hover:bg-white/5 hover:text-white sm:hidden"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notification List - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-slate-900 p-2">
              <NotificationList compact onItemClick={() => setIsOpen(false)} />
            </div>

            {/* Footer - View All Link */}
            <div className="border-t border-white/10 bg-slate-900 p-3 text-center">
              <Link
                to="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-accent transition hover:text-accent/80"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
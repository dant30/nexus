import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import { NotificationList } from "./NotificationList.jsx";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [desktopPanelStyle, setDesktopPanelStyle] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) {
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

  // Prevent body scroll while overlay is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Anchor desktop panel to the bell trigger using fixed coordinates.
  useEffect(() => {
    if (!isOpen) return undefined;

    const updateDesktopPosition = () => {
      if (!triggerRef.current || window.innerWidth < 640) {
        setDesktopPanelStyle(null);
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const maxWidth = Math.min(384, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.right - maxWidth),
        window.innerWidth - maxWidth - 8
      );
      const top = rect.bottom + 8;

      setDesktopPanelStyle({
        position: "fixed",
        top,
        left,
        width: maxWidth,
      });
    };

    updateDesktopPosition();
    window.addEventListener("resize", updateDesktopPosition);
    window.addEventListener("scroll", updateDesktopPosition, true);
    return () => {
      window.removeEventListener("resize", updateDesktopPosition);
      window.removeEventListener("scroll", updateDesktopPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
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

      {/* Dropdown Menu */}
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={panelRef}
              style={desktopPanelStyle || undefined}
              className={`
                fixed bottom-0 left-0 z-[90] flex w-full flex-col
                rounded-t-xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/60
                max-h-[80vh]
                sm:max-h-[600px] sm:rounded-xl
              `}
            >
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
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/5 hover:text-white sm:hidden"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 p-2">
                <NotificationList compact onItemClick={() => setIsOpen(false)} />
              </div>

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
          </>,
          document.body
        )}
    </div>
  );
}

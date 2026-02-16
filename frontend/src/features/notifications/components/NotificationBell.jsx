import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import { NotificationList } from "./NotificationList.jsx";

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [renderOverlay, setRenderOverlay] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [desktopPanelStyle, setDesktopPanelStyle] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);

  const openPanel = () => setIsOpen(true);
  const closePanel = () => setIsOpen(false);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setRenderOverlay(true);
      const raf = requestAnimationFrame(() => setAnimateIn(true));
      return () => cancelAnimationFrame(raf);
    }

    setAnimateIn(false);
    closeTimerRef.current = setTimeout(() => {
      setRenderOverlay(false);
      closeTimerRef.current = null;
    }, 180);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) {
        closePanel();
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
      if (event.key === "Escape") closePanel();
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
        onClick={() => (isOpen ? closePanel() : openPanel())}
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
      {renderOverlay &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm transition-opacity duration-200 ${
                animateIn ? "opacity-100" : "opacity-0"
              }`}
              onClick={closePanel}
            />

            <div
              ref={panelRef}
              style={desktopPanelStyle || undefined}
              className={`
                fixed bottom-0 left-0 z-[90] flex w-full flex-col
                rounded-t-xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/60
                max-h-[80vh]
                sm:max-h-[600px] sm:rounded-xl
                transition-all duration-200
                ${
                  animateIn
                    ? "opacity-100 translate-y-0 sm:translate-y-0"
                    : "opacity-0 translate-y-3 sm:-translate-y-2"
                }
              `}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-slate-900">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      markAllAsRead();
                      closePanel();
                    }}
                    className="text-xs text-accent transition hover:text-accent/80"
                  >
                    Mark all read
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/5 hover:text-white sm:hidden"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 p-2">
                <NotificationList compact onItemClick={closePanel} />
              </div>

              <div className="border-t border-white/10 bg-slate-900 p-3 text-center">
                <Link
                  to="/dashboard/notifications"
                  onClick={closePanel}
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

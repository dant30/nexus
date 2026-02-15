import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
} from "lucide-react";

const CONTACTS = [
  {
    label: "WhatsApp",
    href: "https://wa.me/+254756379735?text=Hello%20Nexus%20Support%2C%20I%20need%20assistance%20with...",
    icon: MessageCircle,
    className: "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
    description: "Quick chat",
    external: true,
  },
  {
    label: "Call",
    href: "tel:+254756379735",
    icon: Phone,
    className: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    description: "Voice call",
  },
  {
    label: "Telegram",
    href: "https://t.me/+g4YJByJPhs5jNzFk",
    icon: Send,
    className: "from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700",
    description: "Instant message",
    external: true,
  },
  {
    label: "Email",
    href: "mailto:delaircapital@gmail.com",
    icon: Mail,
    className: "from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900",
    description: "Detailed inquiry",
  },
];

const vibrate = (pattern = [20]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // noop
  }
};

export default function FloatingContact() {
  const [open, setOpen] = useState(false);
  const [idlePulse, setIdlePulse] = useState(false);
  const idleTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setIdlePulse(false);
      clearTimers();
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      setIdlePulse(true);
      setTimeout(() => setIdlePulse(false), 2600);
    }, 30000);

    return clearTimers;
  }, [open, clearTimers]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const onToggle = () => {
    vibrate([15, 25, 15]);
    setOpen((prev) => !prev);
    setIdlePulse(false);
    clearTimers();
  };

  const onContactClick = () => {
    vibrate([30, 20]);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close contacts"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating Container */}
      <div
        className="fixed z-[70]"
        style={{
          right: "max(0.75rem, env(safe-area-inset-right))",
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Contact Menu */}
        <div
          className={`mb-3 flex flex-col items-end gap-2 transition-all duration-200 ${
            open
              ? "pointer-events-auto opacity-100 translate-y-0"
              : "pointer-events-none opacity-0 translate-y-2"
          }`}
        >
          {CONTACTS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={onContactClick}
              className={`group flex min-w-[12rem] items-center gap-3 rounded-lg border border-white/10 bg-gradient-to-br px-4 py-3 text-white shadow-lg transition hover:-translate-x-1 ${item.className}`}
            >
              <div className="rounded-lg bg-white/20 p-2 flex-shrink-0">
                <item.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="truncate text-xs text-white/80">{item.description}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Contact support"
          className={`relative flex h-14 w-14 items-center justify-center rounded-lg text-white shadow-lg transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16 bg-gradient-to-br ${
            open ? "from-cyan-600 to-cyan-800" : "from-cyan-500 to-cyan-700"
          }`}
        >
          {idlePulse && !open && (
            <>
              <span className="absolute inset-0 animate-ping rounded-lg border border-cyan-300/50" />
              <Sparkles size={12} className="absolute -right-1 -top-1 text-cyan-200" />
            </>
          )}
          {open ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </>
  );
}

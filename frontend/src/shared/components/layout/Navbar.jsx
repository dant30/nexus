import React, { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";

export function Navbar({ onMenuClick, sidebarOpen }) {
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  const accountRef = useRef(null);
  const userRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setOpenAccountMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setOpenUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setOpenNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="sm:hidden rounded-lg p-2 hover:bg-white/5 transition"
          >
            <Menu size={20} />
          </button>

          {/* Logo */}
          <div className="text-lg font-semibold tracking-tight">
            Nexus
          </div>

          {/* Account Switcher */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setOpenAccountMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5 transition"
            >
              <span>Main Account</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  openAccountMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-1rem)]
              rounded-xl border border-white/10
              bg-slate-950/95 backdrop-blur-xl
              shadow-2xl shadow-black/40
              ring-1 ring-black/50
              transition-all duration-150
              ${
                openAccountMenu
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-2">
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 transition">
                  Main Account
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 transition">
                  Trading Account
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 transition">
                  Savings Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setOpenNotifications((prev) => !prev)}
              className="relative rounded-lg p-2 hover:bg-white/5 transition"
            >
              <Bell size={20} />
              {/* Unread badge */}
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </button>

            <div
              className={`absolute top-full mt-2 z-50
              left-1/2 -translate-x-1/2
              sm:left-auto sm:right-0 sm:translate-x-0
              w-[95vw] max-w-sm sm:w-80
              rounded-xl border border-white/10
              bg-slate-950/95 backdrop-blur-xl
              shadow-2xl shadow-black/40
              ring-1 ring-black/50
              transition-all duration-150
              ${
                openNotifications
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-4 text-sm">
                <p className="mb-2 font-medium">Notifications</p>
                <div className="space-y-2 text-white/70">
                  <div className="rounded-lg bg-white/5 p-2">
                    Trade executed successfully.
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    New login detected.
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    Account balance updated.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setOpenUserMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 transition"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  openUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`absolute right-0 top-full mt-2 z-50 w-56
              rounded-xl border border-white/10
              bg-slate-950/95 backdrop-blur-xl
              shadow-2xl shadow-black/40
              ring-1 ring-black/50
              transition-all duration-150
              ${
                openUserMenu
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="p-2 text-sm">
                <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 transition">
                  Profile
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 transition">
                  Settings
                </button>
                <div className="my-2 h-px bg-white/10" />
                <button className="w-full rounded-lg px-3 py-2 text-left text-red-400 hover:bg-red-500/10 transition">
                  Logout
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";

import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";
import { useAuthActions } from "../../../features/auth/hooks/useAuth.js";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";
import { useAccountContext } from "../../../features/accounts/contexts/AccountContext.jsx";
import { NotificationBell } from "../../../features/notifications/components/NotificationBell.jsx";

export function Navbar({ onMenuClick, sidebarOpen }) {
  const { user, isAuthenticated } = useAuth();
  const { signOut } = useAuthActions();
  const { accountType, accountId } = useBalance();
  const { accounts, activeAccount, switchAccount, switching } = useAccountContext() || {};

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const userMenuRef = useRef(null);
  const accountMenuRef = useRef(null);

  const displayName = user?.deriv_full_name?.trim() || user?.first_name || user?.username || "Trader";

  useEffect(() => {
    if (!openUserMenu && !openAccountMenu) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        !event.target.closest("[data-user-menu-trigger]")
      ) {
        setOpenUserMenu(false);
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target) &&
        !event.target.closest("[data-account-menu-trigger]")
      ) {
        setOpenAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openUserMenu, openAccountMenu]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Menu + Logo */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className={`inline-flex sm:hidden rounded-lg border border-white/10 p-2 text-white/70 transition-all hover:border-white/30 hover:text-white hover:bg-white/5 ${
              sidebarOpen ? "bg-white/10" : ""
            }`}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 py-2 transition-transform hover:scale-105"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold text-sm">
              NX
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs uppercase tracking-wider text-white/50 truncate">Nexus</p>
              <p className="text-sm font-semibold leading-none truncate">Trading</p>
            </div>
          </Link>
        </div>

        {/* Right: Actions */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Account Switcher */}
            <div className="relative" ref={accountMenuRef}>
              <button
                data-account-menu-trigger
                onClick={() => {
                  setOpenAccountMenu((v) => !v);
                  setOpenUserMenu(false);
                }}
                className="flex max-w-[10.5rem] items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-xs sm:max-w-none sm:px-3 sm:text-sm text-white/80 transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-white"
              >
                <span className="truncate">{accountType || "Account"}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${openAccountMenu ? "rotate-180" : ""}`}
                />
              </button>

              {openAccountMenu && accounts && accounts.length > 0 && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/40">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-wider text-white/40">Switch Account</p>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        disabled={switching}
                        onClick={() => {
                          switchAccount?.(account.id);
                          setOpenAccountMenu(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm transition-colors ${
                          activeAccount?.id === account.id
                            ? "bg-accent/15 text-accent border-l-2 border-accent"
                            : "text-white/70 hover:bg-white/5 border-l-2 border-transparent"
                        } ${switching ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="min-w-0 text-left flex-1">
                          <p className="font-medium truncate">{account.deriv_account_id || account.id}</p>
                          <p className="text-xs text-white/40">{account.account_type} · {account.currency}</p>
                        </div>
                        {account.balance && (
                          <p className="text-xs font-semibold whitespace-nowrap">{account.balance}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                data-user-menu-trigger
                onClick={() => {
                  setOpenUserMenu((v) => !v);
                  setOpenAccountMenu(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white/80 transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-white"
              >
                <div className="hidden h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-bold sm:flex">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline truncate max-w-[120px]">{displayName}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${openUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {openUserMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl ring-1 ring-black/40">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                    <p className="text-xs text-white/40 truncate">{user?.email || user?.username}</p>
                  </div>

                  <div className="space-y-1 p-2">
                    <Link
                      to="/settings/profile"
                      onClick={() => setOpenUserMenu(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setOpenUserMenu(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="border-t border-white/10 p-2">
                    <button
                      onClick={() => {
                        signOut();
                        setOpenUserMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <Link
            to="/login"
            className="rounded-lg border border-accent/40 px-4 py-2 text-xs sm:text-sm font-medium text-accent transition-all hover:bg-accent/10 hover:border-accent whitespace-nowrap"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

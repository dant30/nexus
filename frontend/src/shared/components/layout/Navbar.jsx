import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";

import { useAuth } from "../../../features/auth/contexts/AuthContext.jsx";
import { useAuthActions } from "../../../features/auth/hooks/useAuth.js";
import { useBalance } from "../../../features/accounts/hooks/useBalance.js";
import { useAccountContext } from "../../../features/accounts/contexts/AccountContext.jsx";

export function Navbar({ onMenuClick }) {
  const { user, isAuthenticated } = useAuth();
  const { signOut } = useAuthActions();
  const { accountType, accountId } = useBalance();
  const { accounts, activeAccount, switchAccount, switching } =
    useAccountContext() || {};

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const userMenuRef = useRef(null);
  const accountMenuRef = useRef(null);

  const displayName =
    user?.deriv_full_name?.trim() ||
    user?.first_name ||
    user?.username ||
    "Trader";

  const accountLabel =
    accountType ||
    (user?.deriv_is_virtual === true
      ? "Virtual"
      : user?.deriv_is_virtual === false
      ? "Real"
      : "Account");

  useEffect(() => {
    if (!openUserMenu && !openAccountMenu) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      const clickedUserMenu =
        userMenuRef.current && userMenuRef.current.contains(target);
      const clickedAccountMenu =
        accountMenuRef.current && accountMenuRef.current.contains(target);

      if (!clickedUserMenu) {
        setOpenUserMenu(false);
      }
      if (!clickedAccountMenu) {
        setOpenAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openUserMenu, openAccountMenu]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/30 hover:text-white sm:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Nexus
            </p>
            <Link to="/dashboard" className="text-lg font-semibold">
              Trading Console
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <>
              <button className="relative rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/30 hover:text-white">
                <Bell size={16} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
              </button>

              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setOpenAccountMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition hover:border-white/30"
                >
                  <span>{accountLabel}</span>
                  {accountId && (
                    <span className="text-white/50">{accountId}</span>
                  )}
                  <ChevronDown size={14} />
                </button>

                {openAccountMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-ink shadow-soft">
                    <p className="px-4 py-2 text-xs uppercase tracking-wide text-white/40">
                      Switch account
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      {accounts?.map((account) => (
                        <button
                          key={account.id}
                          disabled={switching}
                          onClick={() => {
                            switchAccount?.(account.id);
                            setOpenAccountMenu(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-sm transition ${
                            activeAccount?.id === account.id
                              ? "bg-accent/10 text-accent"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <span>{account.deriv_account_id || account.id}</span>
                          <span className="text-xs text-white/40">
                            {account.account_type} · {account.currency}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setOpenUserMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition hover:border-white/30"
                >
                  <span>{displayName}</span>
                  <ChevronDown size={14} />
                </button>

                {openUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-ink shadow-soft">
                    <Link
                      to="/settings/profile"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5"
                    >
                      <User size={14} /> Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/5"
                    >
                      <Settings size={14} /> Settings
                    </Link>
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-danger/10"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!isAuthenticated && (
            <Link
              to="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 transition hover:border-white/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

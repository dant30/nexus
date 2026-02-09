import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import {
  getAccountBalance,
  getDefaultAccount,
  listAccounts,
} from "../services/accountService.js";

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let mounted = true;
    let intervalId;

    const hydrateAccounts = async () => {
      if (!isAuthenticated) {
        if (mounted) {
          setAccounts([]);
          setActiveAccount(null);
        }
        return;
      }

      try {
        const [defaultAccount, accountsList] = await Promise.all([
          getDefaultAccount().catch(() => null),
          listAccounts().catch(() => []),
        ]);

        if (!mounted) return;

        if (accountsList?.length) {
          setAccounts(accountsList);
        }

        if (defaultAccount) {
          setActiveAccount(defaultAccount);
        } else if (accountsList?.length) {
          const fallback = accountsList.find((acc) => acc.is_default) || accountsList[0];
          setActiveAccount(fallback);
        }
      } catch (error) {
        if (mounted) {
          setAccounts([]);
          setActiveAccount(null);
        }
      }
    };

    const pollBalance = async () => {
      if (!activeAccount?.id || !isAuthenticated) return;
      setBalanceLoading(true);
      try {
        const data = await getAccountBalance(activeAccount.id);
        if (!mounted) return;
        setActiveAccount((prev) =>
          prev ? { ...prev, balance: data.balance, currency: data.currency } : prev
        );
      } finally {
        if (mounted) {
          setBalanceLoading(false);
        }
      }
    };

    hydrateAccounts();
    pollBalance();

    intervalId = setInterval(pollBalance, 15000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, activeAccount?.id]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        setAccounts,
        activeAccount,
        setActiveAccount,
        balanceLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export const useAccountContext = () => useContext(AccountContext);

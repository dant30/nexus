import React, { createContext, useContext, useState } from "react";

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);

  return (
    <AccountContext.Provider
      value={{ accounts, setAccounts, activeAccount, setActiveAccount }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export const useAccountContext = () => useContext(AccountContext);

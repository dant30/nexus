/**
 * Root Provider - Combines all context providers
 */

import React from "react";
import { AuthProvider } from "../features/auth/contexts/AuthContext.jsx";
import { WSProvider } from "./WSProvider.jsx";
import { AccountProvider } from "../features/accounts/contexts/AccountContext.jsx";
import { TradingProvider } from "./TradingProvider.jsx";

export function RootProvider({ children }) {
  return (
    <AuthProvider>
      <AccountProvider>
        <WSProvider>
          <TradingProvider>{children}</TradingProvider>
        </WSProvider>
      </AccountProvider>
    </AuthProvider>
  );
}

/**
 * Root Provider - Combines all context providers
 */

import React from "react";
import { AuthProvider } from "../features/auth/contexts/AuthContext.jsx";
import { WSProvider } from "./WSProvider.jsx";
import { AccountProvider } from "../features/accounts/contexts/AccountContext.jsx";
import { TradingProvider } from "./TradingProvider.jsx";
import { NotificationProvider } from "../features/notifications/contexts/NotificationContext.jsx";

export function RootProvider({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AccountProvider>
          <WSProvider>
            <TradingProvider>{children}</TradingProvider>
          </WSProvider>
        </AccountProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

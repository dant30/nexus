/**
 * Root Provider - Combines all context providers
 */

import React from "react";
import { AuthProvider } from "./AuthProvider.jsx";
import { WSProvider } from "./WSProvider.jsx";
import { AccountProvider } from "../features/accounts/contexts/AccountContext.jsx";

export function RootProvider({ children }) {
  return (
    <AuthProvider>
      <AccountProvider>
        <WSProvider>{children}</WSProvider>
      </AccountProvider>
    </AuthProvider>
  );
}

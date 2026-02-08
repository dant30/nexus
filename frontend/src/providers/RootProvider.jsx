/**
 * Root Provider - Combines all context providers
 */

import React from "react";
import { AuthProvider } from "./AuthProvider.jsx";
import { WSProvider } from "./WSProvider.jsx";

export function RootProvider({ children }) {
  return (
    <AuthProvider>
      <WSProvider>{children}</WSProvider>
    </AuthProvider>
  );
}

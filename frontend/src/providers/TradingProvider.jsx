import React from "react";
import { TradingProvider as TradingContextProvider } from "../features/trading/contexts/TradingContext.jsx";
import { BotProvider } from "../features/trading/contexts/BotContext.jsx";

export function TradingProvider({ children }) {
  return (
    <TradingContextProvider>
      <BotProvider>{children}</BotProvider>
    </TradingContextProvider>
  );
}

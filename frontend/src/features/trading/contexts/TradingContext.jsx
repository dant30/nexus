import React, { createContext, useContext, useState } from "react";

const TradingContext = createContext(null);

export function TradingProvider({ children }) {
  const [trades, setTrades] = useState([]);
  return (
    <TradingContext.Provider value={{ trades, setTrades }}>
      {children}
    </TradingContext.Provider>
  );
}

export const useTradingContext = () => useContext(TradingContext);

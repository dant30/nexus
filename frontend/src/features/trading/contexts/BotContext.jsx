import React, { createContext, useContext, useState } from "react";

const BotContext = createContext(null);

export function BotProvider({ children }) {
  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState("scalping");
  const [lastEvent, setLastEvent] = useState(null);
  return (
    <BotContext.Provider value={{ running, setRunning, strategy, setStrategy, lastEvent, setLastEvent }}>
      {children}
    </BotContext.Provider>
  );
}

export const useBotContext = () => useContext(BotContext);

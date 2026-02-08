import React, { createContext, useContext, useState } from "react";

const BotContext = createContext(null);

export function BotProvider({ children }) {
  const [running, setRunning] = useState(false);
  return (
    <BotContext.Provider value={{ running, setRunning }}>
      {children}
    </BotContext.Provider>
  );
}

export const useBotContext = () => useContext(BotContext);

import React, { createContext, useContext, useState } from "react";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = (msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ push, toasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotify = () => useContext(NotificationContext);

import React, { useEffect, useState } from "react";
import { Toast } from "../../../shared/components/ui/feedback/Toast.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";

export function WSErrorToast() {
  const { error, lastErrorAt, reconnectAttempts } = useWebSocket();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!error) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [error, lastErrorAt]);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-50">
      <Toast message={`Live data error. Retry #${reconnectAttempts || 0}`} />
    </div>
  );
}

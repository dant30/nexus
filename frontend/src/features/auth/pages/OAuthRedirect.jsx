import React, { useEffect, useState } from "react";
import { useOAuth } from "../hooks/useOAuth.js";

export function OAuthRedirect() {
  const { startOAuth } = useOAuth();
  const [status, setStatus] = useState("Redirecting to Deriv...");

  useEffect(() => {
    const run = async () => {
      const result = await startOAuth();
      if (!result.ok) {
        setStatus("Unable to start OAuth. Please try again.");
      }
    };

    run();
  }, [startOAuth]);

  return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        {status}
      </div>
    </div>
  );
}
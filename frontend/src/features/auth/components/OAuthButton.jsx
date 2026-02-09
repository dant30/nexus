import React, { useState } from "react";
import { useOAuth } from "../hooks/useOAuth.js";

export function OAuthButton() {
  const { startOAuth } = useOAuth();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    await startOAuth();
    setLoading(false);
  };

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
      disabled={loading}
    >
      {loading ? "Connecting..." : "Connect Deriv"}
    </button>
  );
}
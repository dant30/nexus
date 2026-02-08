import React, { useEffect } from "react";
import { useOAuth } from "../hooks/useOAuth.js";

export function OAuthRedirect() {
  const { startOAuth } = useOAuth();
  useEffect(() => {
    startOAuth();
  }, []);
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      Redirecting to Deriv...
    </div>
  );
}

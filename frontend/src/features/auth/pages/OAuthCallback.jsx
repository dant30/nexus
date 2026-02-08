import React, { useEffect } from "react";

export function OAuthCallback() {
  useEffect(() => {
    // handle callback token exchange if needed
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      Processing OAuth callback...
    </div>
  );
}

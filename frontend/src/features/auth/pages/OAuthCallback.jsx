import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "../hooks/useAuth.js";

export function OAuthCallback() {
  const navigate = useNavigate();
  const { finishOAuth } = useAuthActions();
  const [status, setStatus] = useState("Processing OAuth callback...");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state") || "nexus";
      const token = params.get("token1") || params.get("token");
      const accountId = params.get("acct1") || params.get("account_id");
      const currency = params.get("cur1") || params.get("currency");

      if (!code && !token) {
        setStatus("Missing authorization response. Please retry.");
        return;
      }

      const payload = code
        ? { code, state }
        : { token, account_id: accountId, currency, state };

      const result = await finishOAuth(payload);
      if (result.ok) {
        navigate("/dashboard", { replace: true });
      } else {
        setStatus("OAuth failed. Please try again from the login page.");
      }
    };

    run();
  }, [finishOAuth, navigate]);

  return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        {status}
      </div>
    </div>
  );
}

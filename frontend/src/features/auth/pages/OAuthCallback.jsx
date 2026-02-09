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
      const token2 = params.get("token2");
      const accountId2 = params.get("acct2");
      const currency2 = params.get("cur2");

      if (!code && !token) {
        setStatus("Missing authorization response. Please retry.");
        return;
      }

      const accounts = [];
      if (token && accountId) {
        accounts.push({ token, account_id: accountId, currency });
      }
      if (token2 && accountId2) {
        accounts.push({ token: token2, account_id: accountId2, currency: currency2 });
      }

      const payload = code
        ? { code, state }
        : { token, account_id: accountId, currency, state, accounts: accounts.length ? accounts : undefined };

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

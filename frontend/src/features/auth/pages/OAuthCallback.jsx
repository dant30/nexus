import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "../hooks/useAuth.js";

export function OAuthCallback() {
  const navigate = useNavigate();
  const { finishOAuth } = useAuthActions();
  const [status, setStatus] = useState("Processing OAuth callback...");

  useEffect(() => {
    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ""));
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");
      const state = searchParams.get("state") || "nexus";
      const token = searchParams.get("token1") || searchParams.get("token");
      const accountId = searchParams.get("acct1") || searchParams.get("account_id");
      const currency = searchParams.get("cur1") || searchParams.get("currency");
      const token2 = searchParams.get("token2");
      const accountId2 = searchParams.get("acct2");
      const currency2 = searchParams.get("cur2");

      console.debug("OAuth callback params", {
        code,
        state,
        token,
        accountId,
        currency,
        token2,
        accountId2,
        currency2,
        error,
        errorDescription,
      });

      if (error) {
        const errorMessage = `OAuth provider returned an error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`;
        console.error(errorMessage, { error, errorDescription });
        setStatus(errorMessage);
        return;
      }

      if (!code && !token) {
        setStatus(
          "Missing authorization response. Please retry or verify that your OAuth callback URL is correct."
        );
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
        console.error("OAuth callback failed", result.error);
        const message = result.error?.message || "OAuth failed. Please try again from the login page.";
        setStatus(message);
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

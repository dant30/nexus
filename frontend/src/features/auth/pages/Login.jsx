import React from "react";
import { LoginForm } from "../components/LoginForm.jsx";
import { OAuthButton } from "../components/OAuthButton.jsx";
import { SessionWarning } from "../components/SessionWarning.jsx";

export function Login() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Nexus</p>
            <h1 className="mt-3 text-3xl font-semibold">Secure Access</h1>
            <p className="mt-4 max-w-lg text-sm text-white/60">
              Authenticate to monitor real-time trades, manage strategies, and keep your risk profile
              within guardrails.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold">What you can do</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>Review live balances and open positions.</li>
                <li>Start or pause automated trading strategies.</li>
                <li>Audit signals, risk limits, and execution history.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-white/60">Use your Nexus credentials.</p>
            <LoginForm />
            <div className="mt-6">
              <OAuthButton />
            </div>
            <div className="mt-4">
              <SessionWarning />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from "react";
import Particles from "react-tsparticles";
import { LoginForm } from "../components/LoginForm.jsx";
import { OAuthButton } from "../components/OAuthButton.jsx";
import { SessionWarning } from "../components/SessionWarning.jsx";

export function Login() {
  return (
    <div className="relative min-h-screen bg-ink text-white overflow-hidden">
      {/* Interactive Particle Background */}
      <Particles
        className="absolute inset-0 -z-10"
        options={{
          fpsLimit: 60,
          background: { color: "#0a0a0a" },
          particles: {
            number: { value: 60, density: { enable: true, area: 900 } },
            color: { value: "#00FFAA" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: { min: 1, max: 4 }, random: true },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: true,
              straight: false,
              outModes: { default: "out" },
              attract: { enable: false },
            },
            links: { enable: true, distance: 120, color: "#00FFAA", opacity: 0.2, width: 1 },
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              onClick: { enable: true, mode: "push" },
              resize: true,
            },
            modes: {
              repulse: { distance: 100, duration: 0.4 },
              push: { quantity: 4 },
            },
          },
          detectRetina: true,
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Panel */}
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Nexus</p>
            <h1 className="mt-3 text-3xl font-semibold">Secure Access</h1>
            <p className="mt-4 max-w-lg text-sm text-white/60">
              Authenticate to monitor real-time trades, manage strategies, and keep your risk profile within guardrails.
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

          {/* Right Panel */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft relative">
            <div>
              <h2 className="text-lg font-semibold">Sign in</h2>
              <p className="mt-2 text-sm text-white/60">Use your Nexus credentials.</p>
              <LoginForm />
              <div className="mt-6">
                <OAuthButton />
              </div>
            </div>

            {/* Sticky button / bottom section for mobile */}
            <div className="mt-4 md:mt-6 sticky bottom-0 bg-white/5 p-2 rounded-t-xl md:rounded-none">
              <SessionWarning />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Particles from "react-tsparticles";
import { OAuthButton } from "../components/OAuthButton.jsx";
import { SessionWarning } from "../components/SessionWarning.jsx";

export function Login() {
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    // Ensure particles are visible on mount
    setParticlesReady(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-ink via-ink to-black text-white overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 z-0">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Interactive Particle Background */}
      {particlesReady && (
        <Particles
          className="absolute inset-0 z-0"
          options={{
            fpsLimit: 60,
            background: { color: "transparent" },
            fullScreen: { enable: true, zIndex: 0 },
            particles: {
              number: { value: 80, density: { enable: true, area: 1000 } },
              color: { value: ["#10b981", "#3b82f6", "#ec4899"] },
              shape: { type: "circle" },
              opacity: {
                value: { min: 0.2, max: 0.6 },
                animation: { enable: true, speed: 1, minimumValue: 0.1 },
              },
              size: {
                value: { min: 0.5, max: 2 },
                animation: { enable: true, speed: 2, minimumValue: 0.3 },
              },
              move: {
                enable: true,
                speed: { min: 0.3, max: 1 },
                direction: "none",
                random: true,
                straight: false,
                outModes: { default: "out" },
                attract: { enable: true, rotateX: 300, rotateY: 1200 },
              },
              links: {
                enable: true,
                distance: 150,
                color: { value: "#10b981" },
                opacity: { value: 0.15 },
                width: 1,
                shadow: { enable: false },
              },
              collisions: { enable: false },
              twinkle: { particles: { enable: true, frequency: 0.05, opacity: 1 } },
            },
            interactivity: {
              detectsOn: "window",
              events: {
                onHover: { enable: true, mode: "repulse" },
                onClick: { enable: true, mode: "push" },
                resize: { enable: true },
              },
              modes: {
                repulse: { distance: 100, duration: 0.4, factor: 100, speed: 1, maxSpeed: 50 },
                push: { quantity: 6 },
                grab: { distance: 200, line_linked: { opacity: 1 } },
              },
            },
            detectRetina: true,
            tsParticles: {
              fpsLimit: 60,
            },
          }}
        />
      )}

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 z-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 sm:px-6 py-12 pb-28 md:pb-12">
        <div className="grid w-full gap-8 sm:gap-12 lg:grid-cols-[1.3fr_0.9fr] items-stretch">
          {/* Left Panel */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Branding */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
                <p className="text-xs uppercase tracking-[0.35em] text-white/60 font-semibold">Nexus Trading</p>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Secure Access
                  </span>
                </h1>
                <p className="text-white/70 text-base leading-relaxed max-w-lg">
                  Authenticate to monitor real-time trades, manage strategies, and keep your risk profile within guardrails. Professional-grade trading tools at your fingertips.
                </p>
              </div>
            </div>

            {/* Features Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8 hover:bg-white/8 transition-colors duration-300 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Features</h2>
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">→</span>
                  <span>Monitor live balances, open positions & trade history</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">→</span>
                  <span>Start or pause automated trading strategies instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">→</span>
                  <span>Audit signals, risk limits, commissions & execution</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-1">→</span>
                  <span>Real-time notifications for trades & market events</span>
                </li>
              </ul>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-400">10K+</p>
                <p className="text-xs text-white/50 mt-1">Active Traders</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-400">99.9%</p>
                <p className="text-xs text-white/50 mt-1">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-purple-400">24/7</p>
                <p className="text-xs text-white/50 mt-1">Support</p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="relative h-full min-h-[500px] sm:min-h-auto flex flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 animate-fade-in-up">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Inner content */}
            <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Connect Account</h2>
                <p className="mt-2 text-sm text-white/60">
                  Sign in with your Deriv account to start trading
                </p>
              </div>

              {/* Connection Info */}
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 3.062v6.756a3.066 3.066 0 01-3.062 3.062H7.065a3.066 3.066 0 01-3.062-3.062V6.517a3.066 3.066 0 012.812-3.062zM9 13a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>Secure OAuth 2.0 Connection</span>
                </div>
                <p className="text-xs text-emerald-200/70">128-bit encryption • PCI DSS Compliant</p>
              </div>

              {/* OAuth Button - Hidden on mobile, shown on desktop */}
              <div className="hidden md:block">
                <OAuthButton />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="relative z-10 mt-6 sm:mt-8 pt-6 border-t border-white/10 space-y-4">
              <SessionWarning />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce hidden sm:block">
        <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Mobile Sticky Button - Only visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-20 bg-gradient-to-t from-black via-black to-black/80 backdrop-blur-sm px-4 py-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <OAuthButton />
        </div>
      </div>
    </div>
  );
}

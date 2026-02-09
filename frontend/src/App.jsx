export default function App() {
  const stats = [
    { label: "Balance", value: "$0.00", note: "Live" },
    { label: "Open Trades", value: "0", note: "Today" },
    { label: "Win Rate", value: "0%", note: "30D" },
    { label: "P&L", value: "$0.00", note: "30D" },
  ];

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/10 bg-slate/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Nexus</p>
            <h1 className="text-2xl font-semibold">Trading Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              Status: Ready
            </span>
            <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/30">
              Connect
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                {stat.label}
              </p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-semibold">{stat.value}</span>
                <span className="text-xs text-white/50">{stat.note}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Market Pulse</h2>
            <p className="mt-2 text-sm text-white/60">
              Track real-time signals, volatility, and execution readiness from your configured
              strategies. Connect to start streaming market data.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "Signals: Awaiting",
                "Risk: Neutral",
                "Bot: Offline",
                "Latency: --",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Next Steps</h2>
            <ol className="mt-4 space-y-3 text-sm text-white/70">
              <li>Connect your account to sync balances and open trades.</li>
              <li>Configure risk limits before enabling auto-trading.</li>
              <li>Review signals and confirm preferred strategies.</li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}

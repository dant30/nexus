import React, { useState } from "react";
import { useAuthActions } from "../hooks/useAuth.js";

export function LoginForm() {
  const { signIn } = useAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(username, password);
    if (!result.ok) {
      setError("Unable to sign in. Check credentials and try again.");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-xs uppercase tracking-[0.25em] text-white/50">
        Username or Email
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
          placeholder="you@nexus.app"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label className="block text-xs uppercase tracking-[0.25em] text-white/50">
        Password
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
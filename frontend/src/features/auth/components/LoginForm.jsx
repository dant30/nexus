import React, { useState } from "react";
import { useAuthActions } from "../hooks/useAuth.js";

export function LoginForm() {
  const { signIn } = useAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    await signIn(username, password);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        className="w-full px-3 py-2 rounded bg-slate-700 text-white"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="w-full px-3 py-2 rounded bg-slate-700 text-white"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="w-full bg-green-600 hover:bg-green-700 rounded py-2">
        Sign In
      </button>
    </form>
  );
}

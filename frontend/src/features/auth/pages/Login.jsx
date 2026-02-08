import React from "react";
import { LoginForm } from "../components/LoginForm.jsx";
import { OAuthButton } from "../components/OAuthButton.jsx";

export function Login() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="p-8 bg-slate-800 rounded-lg w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Login</h1>
        <LoginForm />
        <OAuthButton />
      </div>
    </div>
  );
}

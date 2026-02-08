import React from "react";
import { useOAuth } from "../hooks/useOAuth.js";

export function OAuthButton() {
  const { startOAuth } = useOAuth();
  return (
    <button
      onClick={startOAuth}
      className="w-full bg-blue-600 hover:bg-blue-700 rounded py-2"
    >
      Connect Deriv
    </button>
  );
}

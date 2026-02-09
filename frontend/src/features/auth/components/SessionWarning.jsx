import React from "react";
import { useSession } from "../hooks/useSession.js";

export function SessionWarning() {
  const { shouldWarn, secondsLeft } = useSession();

  if (!shouldWarn) return null;

  const minutes = Math.max(Math.ceil(secondsLeft / 60), 1);

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
      Session expires in about {minutes} minute{minutes === 1 ? "" : "s"}. Save your work.
    </div>
  );
}
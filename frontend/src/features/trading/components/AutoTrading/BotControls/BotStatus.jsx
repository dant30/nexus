import React from "react";
import { Card } from "../../../../../shared/components/ui/cards/Card.jsx";
import { useBotContext } from "../../../contexts/BotContext.jsx";

const RECOVERY_MULTIPLIERS = [1.0, 1.5, 2.25, 3.375, 5.0, 7.5, 10.0];

export function BotStatus({
  followSignalDirection = false,
  direction = null,
  recoveryLevel = 0,
  consecutiveLosses = 0,
  baseStake = 0,
}) {
  const { running, lastEvent } = useBotContext();
  const clampedRecoveryLevel = Math.max(0, Math.min(recoveryLevel, RECOVERY_MULTIPLIERS.length - 1));
  const recoveryMultiplier = RECOVERY_MULTIPLIERS[clampedRecoveryLevel];
  const nextStake = Number(baseStake) * recoveryMultiplier;

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Bot Status</div>
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{running ? "Running" : "Stopped"}</span>
        <span className={running ? "text-emerald-300" : "text-amber-300"}>
          {running ? "LIVE" : "IDLE"}
        </span>
      </div>
      <p className="mt-2 text-xs text-white/60">
        Direction: {followSignalDirection ? "Follow Signals" : direction || "Manual"}
      </p>
      {consecutiveLosses > 0 && (
        <div className="mt-2 rounded border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-200">
          <p>Recovery mode active</p>
          <p>Level: {clampedRecoveryLevel}</p>
          <p>Multiplier: {recoveryMultiplier}x</p>
          <p>Consecutive losses: {consecutiveLosses}</p>
          <p>Next stake: ${nextStake.toFixed(2)}</p>
        </div>
      )}
      {lastEvent && (
        <p className="mt-2 text-xs text-white/50">
          {lastEvent.message} - {new Date(lastEvent.timestamp).toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}


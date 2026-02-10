import React from "react";
import { Card } from "../../../../shared/components/ui/cards/Card.jsx";
import { useBotContext } from "../../contexts/BotContext.jsx";

export function BotStatus() {
  const { running, lastEvent } = useBotContext();

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-white/80">Bot Status</div>
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{running ? "Running" : "Stopped"}</span>
        <span className={running ? "text-emerald-300" : "text-amber-300"}>
          {running ? "LIVE" : "IDLE"}
        </span>
      </div>
      {lastEvent && (
        <p className="mt-2 text-xs text-white/50">
          {lastEvent.message} • {new Date(lastEvent.timestamp).toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}

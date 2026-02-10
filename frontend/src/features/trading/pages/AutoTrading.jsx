import React, { useState } from "react";
import { BotStatus } from "../components/BotControls/BotStatus.jsx";
import { StrategySelector } from "../components/BotControls/StrategySelector.jsx";
import { StakeSettings } from "../components/BotControls/StakeSettings.jsx";
import { RiskLimits } from "../components/BotControls/RiskLimits.jsx";
import { TradeButton } from "../components/TradePanel/TradeButton.jsx";
import { useBot } from "../hooks/useBot.js";
import { useBotContext } from "../contexts/BotContext.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";

export function AutoTrading() {
  const { start, stop } = useBot();
  const { running, setRunning, strategy, setStrategy, setLastEvent } = useBotContext();
  const [stake, setStake] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(50);

  const toggleBot = async () => {
    if (running) {
      await stop();
      setRunning(false);
      setLastEvent({ message: "Bot stopped", timestamp: Date.now() });
    } else {
      await start({ strategy, stake, daily_limit: dailyLimit });
      setRunning(true);
      setLastEvent({ message: "Bot started", timestamp: Date.now() });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="text-sm font-semibold text-white/80">Auto Trading</div>
          <StrategySelector value={strategy} onChange={setStrategy} />
          <StakeSettings value={stake} onChange={setStake} />
          <RiskLimits value={dailyLimit} onChange={setDailyLimit} />
          <TradeButton
            onClick={toggleBot}
            className={running ? "bg-rose-500 hover:bg-rose-500/90" : ""}
          >
            {running ? "Stop Bot" : "Start Bot"}
          </TradeButton>
        </Card>
        <BotStatus />
      </div>
    </div>
  );
}

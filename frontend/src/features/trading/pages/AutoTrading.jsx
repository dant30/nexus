import React, { useState } from "react";
import { BotStatus } from "../components/BotControls/BotStatus.jsx";
import { StrategySelector } from "../components/BotControls/StrategySelector.jsx";
import { StakeSettings } from "../components/BotControls/StakeSettings.jsx";
import { RiskLimits } from "../components/BotControls/RiskLimits.jsx";
import { TradeButton } from "../components/TradePanel/TradeButton.jsx";
import { useBot } from "../hooks/useBot.js";
import { useBotContext } from "../contexts/BotContext.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { TRADING } from "../../../core/constants/trading.js";

export function AutoTrading() {
  const { start, stop } = useBot();
  const { running, setRunning, strategy, setStrategy, setLastEvent } = useBotContext();
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();
  const [stake, setStake] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [tradeType, setTradeType] = useState("CALL_PUT");
  const [contractType, setContractType] = useState(TRADING.CONTRACT_TYPES[0].value);
  const [direction, setDirection] = useState(TRADING.DIRECTIONS[0].value);

  const syncTradeType = (next) => {
    if (next.contractType) {
      setContractType(next.contractType);
      setDirection(next.contractType === "CALL" ? "RISE" : "FALL");
    }
    if (next.direction) {
      setDirection(next.direction);
      setContractType(next.direction === "RISE" ? "CALL" : "PUT");
    }
  };

  const toggleBot = async () => {
    if (running) {
      await stop();
      setRunning(false);
      setLastEvent({ message: "Bot stopped", timestamp: Date.now() });
    } else {
      await start({
        strategy,
        stake,
        daily_limit: dailyLimit,
        contract_type: contractType,
        direction,
      });
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Trade Type</label>
            <Select value={tradeType} onChange={(event) => setTradeType(event.target.value)}>
              <option value="CALL_PUT">Call/Put</option>
              <option value="RISE_FALL">Rise/Fall</option>
            </Select>
          </div>
          {tradeType === "CALL_PUT" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Call/Put</label>
              <Select
                value={contractType}
                onChange={(event) => syncTradeType({ contractType: event.target.value })}
              >
                {TRADING.CONTRACT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Rise/Fall</label>
              <Select
                value={direction}
                onChange={(event) => syncTradeType({ direction: event.target.value })}
              >
                {TRADING.DIRECTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Signal Timeframe</label>
            <Select
              value={timeframeSeconds}
              onChange={(event) => setTimeframeSeconds(Number(event.target.value))}
            >
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
            </Select>
          </div>
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

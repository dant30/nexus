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
import { TradeTypeSelector } from "../components/TradePanel/TradeTypeSelector.jsx";

export function AutoTrading() {
  const { start, stop } = useBot();
  const { running, setRunning, strategy, setStrategy, setLastEvent } = useBotContext();
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();
  const [stake, setStake] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [tradeType, setTradeType] = useState(TRADING.TRADE_TYPES[0].value);
  const [contract, setContract] = useState(
    TRADING.TRADE_TYPE_CONTRACTS[TRADING.TRADE_TYPES[0].value][0].value
  );

  const handleTradeTypeChange = (nextTradeType) => {
    setTradeType(nextTradeType);
    const defaultContract = TRADING.TRADE_TYPE_CONTRACTS[nextTradeType]?.[0]?.value;
    if (defaultContract) {
      setContract(defaultContract);
    }
  };

  const deriveLegacyFields = (selectedTradeType, selectedContract) => {
    if (selectedTradeType === "RISE_FALL") {
      return {
        direction: selectedContract,
        contract_type: selectedContract === "RISE" ? "CALL" : "PUT",
      };
    }

    return {
      contract_type: selectedContract,
      direction: selectedContract === "CALL" ? "RISE" : "FALL",
    };
  };

  const toggleBot = async () => {
    if (running) {
      await stop();
      setRunning(false);
      setLastEvent({ message: "Bot stopped", timestamp: Date.now() });
    } else {
      const legacy = deriveLegacyFields(tradeType, contract);
      await start({
        strategy,
        stake,
        daily_limit: dailyLimit,
        trade_type: tradeType,
        contract,
        ...legacy,
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
          <TradeTypeSelector
            tradeType={tradeType}
            contract={contract}
            onTradeTypeChange={handleTradeTypeChange}
            onContractChange={setContract}
          />
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

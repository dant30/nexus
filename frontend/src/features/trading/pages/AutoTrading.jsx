import React, { useEffect, useMemo, useRef, useState } from "react";
import { BotStatus } from "../components/BotControls/BotStatus.jsx";
import { StrategySelector } from "../components/BotControls/StrategySelector.jsx";
import { StakeSettings } from "../components/BotControls/StakeSettings.jsx";
import { RiskLimits } from "../components/BotControls/RiskLimits.jsx";
import { TradeButton } from "../components/TradePanel/TradeButton.jsx";
import { MarketSelector } from "../components/TradePanel/MarketSelector.jsx";
import { useBotContext } from "../contexts/BotContext.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { TRADING } from "../../../core/constants/trading.js";
import { TradeTypeSelector } from "../components/TradePanel/TradeTypeSelector.jsx";
import { useSignals } from "../hooks/useSignals.js";
import { useTrading } from "../hooks/useTrading.js";
import { useMarketData } from "../hooks/useMarketData.js";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";

const STRATEGY_SIGNAL_KEYS = {
  scalping: "ScalpingStrategy",
  breakout: "BreakoutStrategy",
  momentum: "MomentumStrategy",
};

const LOOP_INTERVAL_MS = 3000;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveDurationSeconds = (durationValue, durationUnit) => {
  const value = Math.max(1, toNumber(durationValue, 1));
  if (durationUnit === "ticks") return value;
  if (durationUnit === "seconds") return value;
  if (durationUnit === "minutes") return value * 60;
  return value * 3600;
};

const mapContractToDirection = (tradeType, contract) => {
  if (tradeType === "RISE_FALL") return contract;
  return contract === "CALL" ? "RISE" : "FALL";
};

const extractDirectionFromSignal = (signal, strategy) => {
  if (!signal) return null;

  const strategyKey = STRATEGY_SIGNAL_KEYS[strategy];
  const strategySignal = (signal.strategies || []).find((entry) => entry.strategy === strategyKey);
  const strategyDirection = strategySignal?.signal;
  if (strategyDirection === "RISE" || strategyDirection === "FALL") {
    return strategyDirection;
  }

  const consensusDirection = signal?.consensus?.decision || signal?.direction;
  if (consensusDirection === "RISE" || consensusDirection === "FALL") {
    return consensusDirection;
  }

  return null;
};

export function AutoTrading() {
  const { running, setRunning, strategy, setStrategy, setLastEvent } = useBotContext();
  const { timeframeSeconds, setTimeframeSeconds, openTrades } = useTradingContext();
  const { activeAccount } = useAccountContext();

  const [market, setMarket] = useState("R_50");
  const [stake, setStake] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [tradeType, setTradeType] = useState(TRADING.TRADE_TYPES[0].value);
  const [contract, setContract] = useState(
    TRADING.TRADE_TYPE_CONTRACTS[TRADING.TRADE_TYPES[0].value][0].value
  );
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("ticks");
  const [dailyLossUsed, setDailyLossUsed] = useState(0);

  const { signals } = useSignals();
  const { execute, loading, error } = useTrading();

  // Keeps WS subscription active for selected market and timeframe.
  useMarketData(market, timeframeSeconds);

  const activeSignal = useMemo(
    () => (signals || []).find((signal) => signal.symbol === market) || null,
    [signals, market]
  );

  const lastTradeKeyRef = useRef(null);
  const inFlightRef = useRef(false);

  const handleTradeTypeChange = (nextTradeType) => {
    setTradeType(nextTradeType);
    const defaultContract = TRADING.TRADE_TYPE_CONTRACTS[nextTradeType]?.[0]?.value;
    if (defaultContract) {
      setContract(defaultContract);
    }
  };

  const canRun = !!activeAccount?.id && toNumber(stake, 0) >= TRADING.MIN_STAKE;

  const toggleBot = async () => {
    if (running) {
      setRunning(false);
      setLastEvent({ message: "Bot stopped", timestamp: Date.now() });
      return;
    }

    if (!canRun) {
      setLastEvent({
        message: "Cannot start bot: select account and valid stake.",
        timestamp: Date.now(),
      });
      return;
    }

    setRunning(true);
    setLastEvent({
      message: `Bot started on ${market} (${tradeType} ${contract})`,
      timestamp: Date.now(),
    });
  };

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(async () => {
      if (inFlightRef.current) return;
      if (!canRun) return;

      if ((openTrades || []).length > 0) {
        setLastEvent({
          message: "Waiting for open trade to close.",
          timestamp: Date.now(),
        });
        return;
      }

      const maxLoss = Math.max(0, toNumber(dailyLimit, 0));
      if (dailyLossUsed >= maxLoss && maxLoss > 0) {
        setRunning(false);
        setLastEvent({
          message: "Daily loss limit reached. Bot stopped.",
          timestamp: Date.now(),
        });
        return;
      }

      const signalDirection = extractDirectionFromSignal(activeSignal, strategy);
      if (!signalDirection) {
        setLastEvent({
          message: "No actionable signal yet.",
          timestamp: Date.now(),
        });
        return;
      }

      const configuredDirection = mapContractToDirection(tradeType, contract);
      if (configuredDirection !== signalDirection) {
        setLastEvent({
          message: `Signal ${signalDirection}; waiting for ${configuredDirection}.`,
          timestamp: Date.now(),
        });
        return;
      }

      const signalId = activeSignal?.id || `${activeSignal?.symbol}-${signalDirection}`;
      const tradeKey = `${signalId}-${configuredDirection}-${market}-${durationValue}-${durationUnit}`;
      if (lastTradeKeyRef.current === tradeKey) {
        return;
      }

      inFlightRef.current = true;
      try {
        const payload = {
          symbol: market,
          trade_type: tradeType,
          contract,
          stake: toNumber(stake, TRADING.DEFAULT_STAKE),
          duration_seconds: resolveDurationSeconds(durationValue, durationUnit),
          duration_unit: durationUnit,
          account_id: activeAccount?.id,
        };

        const result = await execute(payload);
        if (result?.ok) {
          lastTradeKeyRef.current = tradeKey;
          const profit = toNumber(result?.data?.profit, 0);
          if (profit < 0) {
            setDailyLossUsed((prev) => prev + Math.abs(profit));
          }
          setLastEvent({
            message: `Auto trade placed (${tradeType} ${contract}) on ${market}.`,
            timestamp: Date.now(),
          });
        } else {
          setLastEvent({
            message: result?.error || "Auto trade failed.",
            timestamp: Date.now(),
          });
        }
      } finally {
        inFlightRef.current = false;
      }
    }, LOOP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [
    running,
    canRun,
    openTrades,
    dailyLossUsed,
    dailyLimit,
    activeSignal,
    strategy,
    tradeType,
    contract,
    market,
    durationValue,
    durationUnit,
    stake,
    activeAccount?.id,
    execute,
    setLastEvent,
    setRunning,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="text-sm font-semibold text-white/80">Auto Trading</div>
          <MarketSelector value={market} onChange={setMarket} />
          <StrategySelector value={strategy} onChange={setStrategy} />
          <TradeTypeSelector
            tradeType={tradeType}
            contract={contract}
            onTradeTypeChange={handleTradeTypeChange}
            onContractChange={setContract}
          />
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Duration</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={durationValue}
                onChange={(event) => setDurationValue(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Unit</label>
              <Select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value)}>
                <option value="ticks">Ticks</option>
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </Select>
            </div>
          </div>
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

          <div className="text-xs text-white/60">
            <p>Selected signal: {activeSignal?.direction || "N/A"}</p>
            <p>Loss used: {dailyLossUsed.toFixed(2)} / {toNumber(dailyLimit, 0).toFixed(2)}</p>
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}
          <TradeButton
            onClick={toggleBot}
            loading={loading && running}
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

import React, { useEffect, useMemo, useState } from "react";
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
import { useMarketData } from "../hooks/useMarketData.js";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";

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

export function AutoTrading() {
  const { running, setRunning, strategy, setStrategy, setLastEvent } = useBotContext();
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();
  const { activeAccount } = useAccountContext();
  const { sendMessage, connected, onMessage } = useWebSocket();

  const [market, setMarket] = useState("R_50");
  const [stake, setStake] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [tradeType, setTradeType] = useState(TRADING.TRADE_TYPES[0].value);
  const [contract, setContract] = useState(
    TRADING.TRADE_TYPE_CONTRACTS[TRADING.TRADE_TYPES[0].value][0].value
  );
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("ticks");
  const [cooldownSeconds, setCooldownSeconds] = useState(10);
  const [maxTradesPerSession, setMaxTradesPerSession] = useState(5);
  const [minConfidence, setMinConfidence] = useState(TRADING.MIN_SIGNAL_CONFIDENCE);
  const [sessionTrades, setSessionTrades] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [loading, setLoading] = useState(false);

  const { signals } = useSignals();
  useMarketData(market, timeframeSeconds);

  useEffect(() => {
    const off = onMessage("bot_status", (payload, message) => {
      const status = payload || message || {};
      const reason = status.reason || "Bot status updated.";
      setLastEvent({ message: reason, timestamp: Date.now() });
      if (typeof status.session_trades === "number") {
        setSessionTrades(status.session_trades);
      }
      if (typeof status.cooldown_until === "number") {
        setCooldownUntil(status.cooldown_until * 1000);
      }
      if (status.state === "stopped") {
        setRunning(false);
      }
    });
    return () => off?.();
  }, [onMessage, setLastEvent, setRunning]);

  const activeSignal = useMemo(
    () => (signals || []).find((signal) => signal.symbol === market) || null,
    [signals, market]
  );

  const handleTradeTypeChange = (nextTradeType) => {
    setTradeType(nextTradeType);
    const defaultContract = TRADING.TRADE_TYPE_CONTRACTS[nextTradeType]?.[0]?.value;
    if (defaultContract) {
      setContract(defaultContract);
    }
  };

  const normalizedCooldownSeconds = Math.max(0, Math.floor(toNumber(cooldownSeconds, 0)));
  const normalizedMaxTradesPerSession = Math.max(1, Math.floor(toNumber(maxTradesPerSession, 1)));
  const normalizedMinConfidence = Math.min(
    1,
    Math.max(0, toNumber(minConfidence, TRADING.MIN_SIGNAL_CONFIDENCE))
  );
  const cooldownRemainingSeconds = Math.max(
    0,
    Math.ceil((toNumber(cooldownUntil, 0) - Date.now()) / 1000)
  );

  const canRun = !!activeAccount?.id && toNumber(stake, 0) >= TRADING.MIN_STAKE;

  const toggleBot = async () => {
    if (running) {
      sendMessage("bot_stop", { symbol: market });
      setRunning(false);
      setLastEvent({ message: "Bot stopped.", timestamp: Date.now() });
      return;
    }

    if (!canRun || !connected) {
      setLastEvent({
        message: "Cannot start bot: check account, stake, and WebSocket connection.",
        timestamp: Date.now(),
      });
      return;
    }

    setLoading(true);
    try {
      const durationSeconds = resolveDurationSeconds(durationValue, durationUnit);
      setSessionTrades(0);
      setCooldownUntil(0);

      sendMessage("bot_start", {
        symbol: market,
        interval: timeframeSeconds,
        stake: Number(stake),
        duration_seconds: durationSeconds,
        trade_type: tradeType,
        contract,
        strategy,
        min_confidence: normalizedMinConfidence,
        cooldown_seconds: normalizedCooldownSeconds,
        max_trades_per_session: normalizedMaxTradesPerSession,
        daily_loss_limit: Math.max(0, toNumber(dailyLimit, 0)),
      });
      setRunning(true);
      setLastEvent({
        message: `Bot started on ${market} (${tradeType} ${contract}).`,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">
                Cooldown (seconds)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={cooldownSeconds}
                onChange={(event) => setCooldownSeconds(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">
                Max Trades / Session
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={maxTradesPerSession}
                onChange={(event) => setMaxTradesPerSession(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">
              Min Signal Confidence ({Math.round(normalizedMinConfidence * 100)}%)
            </label>
            <Input
              type="range"
              min="0.5"
              max="1"
              step="0.01"
              value={normalizedMinConfidence}
              onChange={(event) => setMinConfidence(event.target.value)}
            />
          </div>

          <div className="text-xs text-white/60">
            <p>Selected signal: {activeSignal?.direction || "N/A"}</p>
            <p>
              Signal confidence:{" "}
              {Math.round(
                toNumber(activeSignal?.consensus?.confidence ?? activeSignal?.confidence, 0) * 100
              )}
              %
            </p>
            <p>
              Session trades: {sessionTrades} / {normalizedMaxTradesPerSession}
            </p>
            <p>Cooldown remaining: {cooldownRemainingSeconds}s</p>
          </div>

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

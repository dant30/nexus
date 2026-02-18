import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BotStatus,
  StakeSettings,
  RiskLimits,
  StrategySelector,
  TradeButton,
  MarketSelector,
  SignalDisplay,
  RiskWarning,
  PriceChart,
  CandlestickChart,
  TickChart,
} from "../components/AutoTrading/index.js";
import { useBotContext } from "../contexts/BotContext.jsx";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { TRADING } from "../../../core/constants/trading.js";
import { useSignals } from "../hooks/useSignals.js";
import { useMarketData } from "../hooks/useMarketData.js";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { useWebSocket } from "../../../providers/WSProvider.jsx";
import { getRiskSettings, getTradingPreferences } from "../../settings/services/settingsService.js";

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveDurationSeconds = (durationValue, durationUnit) => {
  const value = Math.max(1, toNumber(durationValue, 1));
  if (durationUnit === "ticks") return value;
  if (durationUnit === "seconds") return value;
  if (durationUnit === "minutes") return value * 60;
  if (durationUnit === "hours") return value * 3600;
  return value * 86400;
};

const toDerivDurationUnit = (durationUnit) => {
  if (durationUnit === "ticks") return "t";
  if (durationUnit === "seconds") return "s";
  if (durationUnit === "minutes") return "m";
  if (durationUnit === "hours") return "h";
  if (durationUnit === "days") return "d";
  return "t";
};

export function AutoTrading() {
  const { running, setRunning, setLastEvent } = useBotContext();
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();
  const { activeAccount } = useAccountContext();
  const { sendMessage, connected, onMessage } = useWebSocket();

  const [market, setMarket] = useState("R_50");
  const [strategy, setStrategy] = useState("scalping");
  const [stake, setStake] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [dailyProfitTarget, setDailyProfitTarget] = useState(0);
  const [sessionTakeProfit, setSessionTakeProfit] = useState(0);
  const [recoveryMode, setRecoveryMode] = useState("FIBONACCI");
  const [recoveryMultiplier, setRecoveryMultiplier] = useState(1.6);
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("ticks");
  const [cooldownSeconds, setCooldownSeconds] = useState(10);
  const [maxTradesPerSession, setMaxTradesPerSession] = useState(120);
  const [minConfidence, setMinConfidence] = useState(TRADING.MIN_SIGNAL_CONFIDENCE);
  const [tradeType, setTradeType] = useState("RISE_FALL");
  const [sessionTrades, setSessionTrades] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [recoveryLevel, setRecoveryLevel] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [dailyLoss, setDailyLoss] = useState(0);
  const [dailyProfit, setDailyProfit] = useState(0);
  const [sessionRealizedProfit, setSessionRealizedProfit] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const winAudioRef = useRef(null);
  const lossAudioRef = useRef(null);
  const playedSettlementRef = useRef(new Set());

  const { signals } = useSignals();
  const { data: marketData } = useMarketData(market, timeframeSeconds);
  const ticks = marketData?.ticks || [];
  const candles = marketData?.candles || [];

  useEffect(() => {
    let mounted = true;
    const loadDefaults = async () => {
      try {
        const [risk, trading] = await Promise.all([getRiskSettings(), getTradingPreferences()]);
        if (!mounted) return;
        setStake(Number(trading?.defaultStake || 1));
        setDailyLimit(Number(risk?.dailyLossLimit || 0));
        setDailyProfitTarget(Number(trading?.dailyProfitTarget || 0));
        setSessionTakeProfit(Number(trading?.sessionTakeProfit || 0));
        setRecoveryMode(String(trading?.recoveryMode || "FIBONACCI").toUpperCase());
        setRecoveryMultiplier(Number(trading?.recoveryMultiplier || 1.6));
        setCooldownSeconds(Number(trading?.cooldownSeconds || 10));
        setMaxTradesPerSession(Number(trading?.maxTradesPerSession || 120));
        setMinConfidence(Number(trading?.minSignalConfidence || TRADING.MIN_SIGNAL_CONFIDENCE));
        if (trading?.defaultSymbol) {
          setMarket(String(trading.defaultSymbol).toUpperCase());
        }
      } catch (_) {
        // Keep built-in defaults when settings are unavailable.
      }
    };
    loadDefaults();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tradeType === "CALL_PUT" && ["ticks", "seconds"].includes(durationUnit)) {
      setDurationUnit("minutes");
      setDurationValue(1);
    }
  }, [tradeType, durationUnit]);

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
      if (typeof status.recovery_level === "number") {
        setRecoveryLevel(status.recovery_level);
      }
      if (typeof status.consecutive_losses === "number") {
        setConsecutiveLosses(status.consecutive_losses);
      }
      if (typeof status.daily_loss === "number") {
        setDailyLoss(status.daily_loss);
      }
      if (typeof status.daily_profit === "number") {
        setDailyProfit(status.daily_profit);
      }
      if (typeof status.session_realized_profit === "number") {
        setSessionRealizedProfit(status.session_realized_profit);
      }
      if (typeof status.recovery_mode === "string") {
        setRecoveryMode(String(status.recovery_mode).toUpperCase());
      }
      if (typeof status.recovery_multiplier === "number") {
        setRecoveryMultiplier(status.recovery_multiplier);
      }
      if (status.state === "stopped") {
        setRunning(false);
      }
    });
    return () => off?.();
  }, [onMessage, setLastEvent, setRunning]);

  useEffect(() => {
    const winAudio = new Audio("/sounds/WON.mp3");
    const lossAudio = new Audio("/sounds/LOST.mp3");
    winAudio.preload = "auto";
    lossAudio.preload = "auto";
    winAudio.volume = 0.8;
    lossAudio.volume = 0.8;
    winAudioRef.current = winAudio;
    lossAudioRef.current = lossAudio;
    return () => {
      winAudioRef.current = null;
      lossAudioRef.current = null;
      playedSettlementRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const playSound = (audio) => {
      if (!audio) return;
      try {
        audio.currentTime = 0;
        const maybePromise = audio.play();
        if (maybePromise?.catch) {
          maybePromise.catch(() => {});
        }
      } catch {
        // No-op
      }
    };

    const offTradeStatus = onMessage("trade_status", (payload, message) => {
      const status = String((payload || message || {}).status || "").toUpperCase();
      const tradeId = (payload || message || {}).trade_id;
      if (!tradeId || (status !== "WON" && status !== "LOST")) return;

      const key = `${tradeId}:${status}`;
      if (playedSettlementRef.current.has(key)) return;
      playedSettlementRef.current.add(key);

      if (status === "WON") playSound(winAudioRef.current);
      if (status === "LOST") playSound(lossAudioRef.current);
    });

    return () => offTradeStatus?.();
  }, [onMessage]);

  const activeSignal = useMemo(
    () => (signals || []).find((signal) => signal.symbol === market) || null,
    [signals, market]
  );

  const normalizedCooldownSeconds = Math.max(0, Math.floor(toNumber(cooldownSeconds, 0)));
  const normalizedMaxTradesPerSession = Math.max(1, Math.floor(toNumber(maxTradesPerSession, 1)));
  const normalizedMinConfidence = Math.min(
    1,
    Math.max(0, toNumber(minConfidence, TRADING.MIN_SIGNAL_CONFIDENCE))
  );
  const normalizedStake = Math.max(0, toNumber(stake, 0));
  const stakeInRange = normalizedStake >= TRADING.MIN_STAKE && normalizedStake <= TRADING.MAX_STAKE;

  const cooldownRemainingSeconds = Math.max(
    0,
    Math.ceil((toNumber(cooldownUntil, 0) - Date.now()) / 1000)
  );

  const canRun = !!activeAccount?.id && stakeInRange;

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
        strategy,
        interval: timeframeSeconds,
        stake: Number(normalizedStake),
        duration: Math.max(1, Math.floor(toNumber(durationValue, 1))),
        duration_unit: toDerivDurationUnit(durationUnit),
        duration_seconds: durationSeconds,
        follow_signal_direction: true,
        trade_type: tradeType,
        min_confidence: normalizedMinConfidence,
        cooldown_seconds: normalizedCooldownSeconds,
        max_trades_per_session: normalizedMaxTradesPerSession,
        daily_loss_limit: Math.max(0, toNumber(dailyLimit, 0)),
        daily_profit_target: Math.max(0, toNumber(dailyProfitTarget, 0)),
        session_take_profit: Math.max(0, toNumber(sessionTakeProfit, 0)),
        recovery_mode: String(recoveryMode || "FIBONACCI").toUpperCase(),
        recovery_multiplier: Math.max(1, toNumber(recoveryMultiplier, 1.6)),
      });
      setRunning(true);
      setLastEvent({
        message: `Bot started on ${market} (${strategy}, ${tradeType}).`,
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
          <div className="grid gap-3 md:grid-cols-2">
            <MarketSelector value={market} onChange={setMarket} />
            <StrategySelector value={strategy} onChange={setStrategy} />
          </div>
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
                {tradeType === "RISE_FALL" ? <option value="ticks">Ticks</option> : null}
                {tradeType === "RISE_FALL" ? <option value="seconds">Seconds</option> : null}
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
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
          <RiskWarning stake={normalizedStake} isValid={stakeInRange} />
          <RiskLimits value={dailyLimit} onChange={setDailyLimit} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">
                Daily Profit Target
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={dailyProfitTarget}
                onChange={(event) => setDailyProfitTarget(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">
                Session Take-Profit
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sessionTakeProfit}
                onChange={(event) => setSessionTakeProfit(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Trade Type</label>
            <Select value={tradeType} onChange={(event) => setTradeType(event.target.value)}>
              <option value="RISE_FALL">Rise/Fall</option>
              <option value="CALL_PUT">Call/Put</option>
            </Select>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs font-semibold text-white/70 transition hover:text-white"
            >
              {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </button>
          </div>
          {showAdvanced ? (
            <>
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
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">
                  Recovery Mode
                </label>
                <Select
                  value={recoveryMode}
                  onChange={(event) => setRecoveryMode(String(event.target.value).toUpperCase())}
                >
                  <option value="FIBONACCI">Fibonacci</option>
                  <option value="HYBRID">Hybrid (Fib + Martingale)</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">
                  Recovery Multiplier
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={recoveryMultiplier}
                  onChange={(event) => setRecoveryMultiplier(event.target.value)}
                />
              </div>
            </>
          ) : null}
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
            <p>Session trades: {sessionTrades} / {normalizedMaxTradesPerSession}</p>
            <p>Cooldown remaining: {cooldownRemainingSeconds}s</p>
            <p>Direction mode: Follow signal direction</p>
            <p>Contract mode: {tradeType === "CALL_PUT" ? "Call/Put" : "Rise/Fall"}</p>
            <p>Daily realized loss: {toNumber(dailyLoss, 0).toFixed(2)}</p>
            <p>Daily realized profit: {toNumber(dailyProfit, 0).toFixed(2)}</p>
            <p>Session realized profit: {toNumber(sessionRealizedProfit, 0).toFixed(2)}</p>
          </div>

          <TradeButton
            onClick={toggleBot}
            loading={loading && running}
            className={running ? "bg-rose-500 hover:bg-rose-500/90" : ""}
          >
            {running ? "Stop Bot" : "Start Bot"}
          </TradeButton>
        </Card>

        <div className="space-y-4">
          <BotStatus
            followSignalDirection={true}
            recoveryLevel={recoveryLevel}
            consecutiveLosses={consecutiveLosses}
            baseStake={Number(normalizedStake)}
          />
          <SignalDisplay signal={activeSignal} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PriceChart symbol={market} ticks={ticks} />
        <TickChart ticks={ticks} />
        <CandlestickChart symbol={market} candles={candles} />
      </div>
    </div>
  );
}






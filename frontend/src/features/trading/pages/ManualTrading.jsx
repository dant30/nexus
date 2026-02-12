import React, { useMemo, useState } from "react";
import { MarketSelector } from "../components/TradePanel/MarketSelector.jsx";
import { StakeInput } from "../components/TradePanel/StakeInput.jsx";
import { SignalDisplay } from "../components/TradePanel/SignalDisplay.jsx";
import { RiskWarning } from "../components/TradePanel/RiskWarning.jsx";
import { TradeButton } from "../components/TradePanel/TradeButton.jsx";
import { useSignals } from "../hooks/useSignals.js";
import { useRiskCalculator } from "../hooks/useRiskCalculator.js";
import { useTrading } from "../hooks/useTrading.js";
import { useMarketData } from "../hooks/useMarketData.js";
import { TRADING } from "../../../core/constants/trading.js";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { useAccountContext } from "../../accounts/contexts/AccountContext.jsx";
import { PriceChart } from "../components/Charts/PriceChart.jsx";
import { CandlestickChart } from "../components/Charts/CandlestickChart.jsx";
import { TickChart } from "../components/Charts/TickChart.jsx";
import { Select } from "../../../shared/components/ui/inputs/Select.jsx";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { useTradingContext } from "../contexts/TradingContext.jsx";
import { TradeTypeSelector } from "../components/TradePanel/TradeTypeSelector.jsx";

export function ManualTrading() {
  const [market, setMarket] = useState("R_50");
  const [tradeType, setTradeType] = useState(TRADING.TRADE_TYPES[0].value);
  const [contract, setContract] = useState(
    TRADING.TRADE_TYPE_CONTRACTS[TRADING.TRADE_TYPES[0].value][0].value
  );
  const [stake, setStake] = useState(TRADING.DEFAULT_STAKE);
  const [durationValue, setDurationValue] = useState(5);
  const [durationUnit, setDurationUnit] = useState("minutes");
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();

  const { signals } = useSignals();
  const { isStakeValid } = useRiskCalculator();
  const { execute, loading, error, lastTrade } = useTrading();
  const { activeAccount } = useAccountContext();
  const { data: marketData } = useMarketData(market, timeframeSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);

  const topSignal = useMemo(() => {
    const liveSignal = signals?.find((signal) => signal.symbol === market) || signals?.[0];
    if (liveSignal) return liveSignal;
    const recentTicks = marketData?.ticks?.slice(-10) || [];
    if (recentTicks.length < 2) return null;
    const first = Number(recentTicks[0].price);
    const last = Number(recentTicks[recentTicks.length - 1].price);
    return {
      id: `local-${market}`,
      symbol: market,
      direction: last >= first ? "RISE" : "FALL",
      confidence: 0.6,
      timeframe: "live",
      source: "Market Ticks",
    };
  }, [signals, market, marketData?.ticks]);

  const handleTradeTypeChange = (nextTradeType) => {
    setTradeType(nextTradeType);
    const defaultContract = TRADING.TRADE_TYPE_CONTRACTS[nextTradeType]?.[0]?.value;
    if (defaultContract) {
      setContract(defaultContract);
    }
  };

  const numericStake = Number(stake);
  const stakeIsValid = isStakeValid(numericStake);

  const resolveDurationSeconds = () => {
    const value = Math.max(1, Number(durationValue) || 1);
    if (durationUnit === "ticks") return value;
    if (durationUnit === "seconds") return value;
    if (durationUnit === "minutes") return value * 60;
    return value * 3600;
  };

  const submitTrade = async () => {
    if (!stakeIsValid || !activeAccount?.id) return;
    const normalizedDurationValue = Math.max(1, Number(durationValue) || 1);
    setPendingTrade({
      symbol: market,
      trade_type: tradeType,
      contract,
      stake: numericStake,
      duration_seconds: resolveDurationSeconds(),
      duration_value: normalizedDurationValue,
      duration_unit: durationUnit,
    });
    setConfirmOpen(true);
  };

  const confirmTrade = async () => {
    if (!pendingTrade) return;
    await execute(pendingTrade);
    setConfirmOpen(false);
    setPendingTrade(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="text-sm font-semibold text-white/80">Manual Trade</div>
          <MarketSelector value={market} onChange={setMarket} />
          <TradeTypeSelector
            tradeType={tradeType}
            contract={contract}
            onTradeTypeChange={handleTradeTypeChange}
            onContractChange={setContract}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Timeframe</label>
            <Select
              value={timeframeSeconds}
              onChange={(event) => setTimeframeSeconds(Number(event.target.value))}
            >
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
            </Select>
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
                <option value="ticks">Ticks</option>
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </Select>
            </div>
          </div>
          <StakeInput
            value={stake}
            onChange={setStake}
            min={TRADING.MIN_STAKE}
            max={TRADING.MAX_STAKE}
          />
          <RiskWarning stake={numericStake} isValid={stakeIsValid} />
          {!activeAccount?.id && (
            <p className="text-xs text-amber-300">Select or create an account to trade.</p>
          )}
          {error && <p className="text-xs text-rose-300">{error}</p>}
          {lastTrade && (
            <p className="text-xs text-emerald-300">
              Trade #{lastTrade.id} created (
              {lastTrade.trade_type || "RISE_FALL"} {lastTrade.contract || lastTrade.direction}).
            </p>
          )}
          <TradeButton
            loading={loading}
            disabled={!stakeIsValid || !activeAccount?.id}
            onClick={submitTrade}
          />
        </Card>
        <SignalDisplay signal={topSignal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PriceChart ticks={marketData.ticks} symbol={market} />
        <CandlestickChart candles={marketData.candles} symbol={market} />
        <TickChart ticks={marketData.ticks} />
      </div>

      {confirmOpen && pendingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 p-5 text-white shadow-xl">
            <div className="text-sm font-semibold">Confirm Trade</div>
            <div className="mt-3 space-y-1 text-xs text-white/70">
              <p>Market: {pendingTrade.symbol}</p>
              <p>
                {pendingTrade.trade_type} | {pendingTrade.contract}
              </p>
              <p>Stake: {pendingTrade.stake}</p>
              <p>
                Duration: {pendingTrade.duration_value} {pendingTrade.duration_unit}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-md bg-slate-700 px-4 py-2 text-xs font-semibold text-white/80"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingTrade(null);
                }}
              >
                Cancel
              </button>
              <TradeButton className="flex-1" onClick={confirmTrade} loading={loading}>
                Confirm
              </TradeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

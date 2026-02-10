import React, { useMemo, useState } from "react";
import { MarketSelector } from "../components/TradePanel/MarketSelector.jsx";
import { ContractSelector } from "../components/TradePanel/ContractSelector.jsx";
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
import { useTradingContext } from "../contexts/TradingContext.jsx";

export function ManualTrading() {
  const [market, setMarket] = useState("R_50");
  const [contractType, setContractType] = useState(TRADING.CONTRACT_TYPES[0].value);
  const [direction, setDirection] = useState(TRADING.DIRECTIONS[0].value);
  const [stake, setStake] = useState(TRADING.DEFAULT_STAKE);
  const { timeframeSeconds, setTimeframeSeconds } = useTradingContext();

  const { signals } = useSignals();
  const { isStakeValid } = useRiskCalculator();
  const { execute, loading, error, lastTrade } = useTrading();
  const { activeAccount } = useAccountContext();
  const { data: marketData } = useMarketData(market, timeframeSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);

  const topSignal = useMemo(
    () => signals?.find((signal) => signal.symbol === market) || signals?.[0],
    [signals, market]
  );

  const handleContractChange = (next) => {
    if (next.contractType) setContractType(next.contractType);
    if (next.direction) setDirection(next.direction);
  };

  const numericStake = Number(stake);
  const stakeIsValid = isStakeValid(numericStake);

  const submitTrade = async () => {
    if (!stakeIsValid || !activeAccount?.id) return;
    setPendingTrade({
      symbol: market,
      contract_type: contractType,
      direction,
      stake: numericStake,
      duration_seconds: 300,
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
          <ContractSelector
            contractType={contractType}
            direction={direction}
            onChange={handleContractChange}
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
            <p className="text-xs text-emerald-300">Trade #{lastTrade.id} created.</p>
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
                {pendingTrade.contract_type} • {pendingTrade.direction}
              </p>
              <p>Stake: {pendingTrade.stake}</p>
              <p>Duration: {pendingTrade.duration_seconds}s</p>
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

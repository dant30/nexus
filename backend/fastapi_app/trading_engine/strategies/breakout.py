"""
Breakout trading strategy with dynamic support/resistance.
Professional implementation with volatility adjustment and confirmation.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class BreakoutStrategy(BaseStrategy):
    """
    Breakout Strategy - More sensitive to price action.
    """
    
    MIN_LOOKBACK = 10
    DEFAULT_LOOKBACK = 15  # Was 20 - more responsive
    BREAKOUT_BUFFER_PERCENT = 0.0003  # Was 0.0005 - easier to trigger
    MIN_CONFIDENCE_THRESHOLD = 0.45  # Was 0.60
    
    def __init__(self, symbol: str, period: int = 60, lookback: int = DEFAULT_LOOKBACK):
        super().__init__(symbol, period)
        self.lookback = max(lookback, self.MIN_LOOKBACK)
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        if not candles or len(candles) < self.lookback:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Insufficient data",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        recent = candles[-self.lookback:]
        closes = [float(c["close"]) for c in recent]
        highs = [float(c["high"]) for c in recent]
        lows = [float(c["low"]) for c in recent]
        
        resistance = max(highs)
        support = min(lows)
        current = closes[-1]
        range_height = resistance - support
        
        # Use SMA for trend detection
        sma_5 = self._calculate_sma(closes, 5)
        sma_10 = self._calculate_sma(closes, 10)
        
        # BULLISH - price breaking up
        if current > resistance * 0.998:  # Within 0.2% of resistance
            strength = (current - support) / range_height if range_height > 0 else 0.5
            confidence = 0.45 + (strength * 0.25)
            
            # Check if we're actually breaking out
            if current > resistance:
                confidence += 0.15
                signal = Signal.RISE
                reason = f"Breaking above resistance {resistance:.5f}"
            else:
                # Approaching resistance
                if sma_5 and sma_10 and sma_5 > sma_10:  # Uptrend
                    signal = Signal.RISE
                    reason = f"Approaching resistance {resistance:.5f} in uptrend"
                    confidence = 0.50
                else:
                    signal = Signal.HOLD
                    reason = f"Near resistance {resistance:.5f}"
                    confidence = 0.40
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"support": support, "resistance": resistance}
            )
        
        # BEARISH - price breaking down
        elif current < support * 1.002:  # Within 0.2% of support
            strength = (resistance - current) / range_height if range_height > 0 else 0.5
            confidence = 0.45 + (strength * 0.25)
            
            if current < support:
                confidence += 0.15
                signal = Signal.FALL
                reason = f"Breaking below support {support:.5f}"
            else:
                # Approaching support
                if sma_5 and sma_10 and sma_5 < sma_10:  # Downtrend
                    signal = Signal.FALL
                    reason = f"Approaching support {support:.5f} in downtrend"
                    confidence = 0.50
                else:
                    signal = Signal.HOLD
                    reason = f"Near support {support:.5f}"
                    confidence = 0.40
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"support": support, "resistance": resistance}
            )
        
        # Range-bound
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason=f"Range-bound between {support:.5f} - {resistance:.5f}",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"support": support, "resistance": resistance}
        )

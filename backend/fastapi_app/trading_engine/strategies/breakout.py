"""
Breakout trading strategy with dynamic support/resistance.
Balanced for clearer signals with confirmation.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class BreakoutStrategy(BaseStrategy):
    """
    Breakout Strategy - Requires confirmation for clearer signals.
    """
    
    MIN_LOOKBACK = 15  # More data for better levels
    DEFAULT_LOOKBACK = 20  # More stable support/resistance
    BREAKOUT_BUFFER_PERCENT = 0.0004  # Balanced buffer
    MIN_CONFIDENCE_THRESHOLD = 0.55  # Higher threshold
    
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
        
        # Use multiple timeframes for confirmation
        sma_5 = self._calculate_sma(closes, 5)
        sma_10 = self._calculate_sma(closes, 10)
        sma_20 = self._calculate_sma(closes, 20)

        # Check for volume/volatility confirmation
        atr = self._calculate_atr(highs, lows, closes)
        volatility_ratio = atr / (sma_20 or 1) if sma_20 else 0.01
        
        # BULLISH - breakout above resistance
        if current > resistance * 0.999:  # Slightly looser to catch moves
            breakout_strength = (current - support) / range_height if range_height > 0 else 0.5
            confidence = 0.50 + (breakout_strength * 0.20)
            
            # Check for actual breakout
            if current > resistance:
                # Confirm with moving averages
                if sma_5 and sma_10 and sma_5 > sma_10:
                    confidence += 0.20
                    signal = Signal.RISE
                    reason = f"Breakout above {resistance:.5f} with uptrend"
                else:
                    confidence += 0.10
                    signal = Signal.RISE
                    reason = f"Breakout above {resistance:.5f}"
            else:
                # Approaching resistance
                if sma_5 and sma_10 and sma_5 > sma_10:
                    # In uptrend, approaching resistance is bullish
                    confidence = 0.55
                    signal = Signal.RISE
                    reason = f"Approaching {resistance:.5f} in uptrend"
                else:
                    signal = Signal.HOLD
                    reason = f"Near resistance {resistance:.5f}"
                    confidence = 0.40

            # High volatility reduces confidence
            if volatility_ratio > 0.02:  # High volatility
                confidence *= 0.9
                reason += " (high volatility caution)"
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"support": support, "resistance": resistance, "atr": atr}
            )
        
        # BEARISH - breakdown below support
        elif current < support * 1.001:  # Slightly looser to catch moves
            breakdown_strength = (resistance - current) / range_height if range_height > 0 else 0.5
            confidence = 0.50 + (breakdown_strength * 0.20)
            
            if current < support:
                # Confirm with moving averages
                if sma_5 and sma_10 and sma_5 < sma_10:
                    confidence += 0.20
                    signal = Signal.FALL
                    reason = f"Breakdown below {support:.5f} with downtrend"
                else:
                    confidence += 0.10
                    signal = Signal.FALL
                    reason = f"Breakdown below {support:.5f}"
            else:
                # Approaching support
                if sma_5 and sma_10 and sma_5 < sma_10:
                    confidence = 0.55
                    signal = Signal.FALL
                    reason = f"Approaching {support:.5f} in downtrend"
                else:
                    signal = Signal.HOLD
                    reason = f"Near support {support:.5f}"
                    confidence = 0.40

            # High volatility reduces confidence
            if volatility_ratio > 0.02:
                confidence *= 0.9
                reason += " (high volatility caution)"
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"support": support, "resistance": resistance, "atr": atr}
            )
        
        # Range-bound
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason=f"Range-bound {support:.5f} - {resistance:.5f}",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"support": support, "resistance": resistance}
        )

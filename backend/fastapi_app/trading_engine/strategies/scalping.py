"""
Scalping trading strategy for fast, small-profit trades.
Professional implementation with Bollinger Bands + tick momentum confirmation.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class ScalpingStrategy(BaseStrategy):
    """
    Scalping Strategy - Fast, frequent signals.
    """
    
    BB_PERIOD = 15  # Was 20 - more responsive
    BB_STD_DEV = 1.8  # Was 2.0 - tighter bands = more signals
    TICK_MOMENTUM_PERIOD = 2  # Was 3 - faster reaction
    MIN_TICK_MOMENTUM = 0.00005  # Was 0.0001 - more sensitive
    MIN_CONFIDENCE_THRESHOLD = 0.45  # Was 0.60
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        if not candles or len(candles) < self.BB_PERIOD:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Insufficient candles",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        if not ticks or len(ticks) < 3:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Insufficient ticks",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        closes = [float(c["close"]) for c in candles]
        current = closes[-1]
        
        # Get recent ticks
        recent_ticks = [float(t["price"]) if isinstance(t, dict) else float(t) 
                       for t in ticks[-3:]]
        
        tick_trend = recent_ticks[-1] - recent_ticks[0]
        
        # Calculate Bollinger Bands
        bb = self._calculate_bollinger_bands(closes, self.BB_PERIOD, self.BB_STD_DEV)
        if bb is None:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="No Bollinger Bands",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        # Position relative to bands
        band_range = bb["upper_band"] - bb["lower_band"]
        position = (current - bb["lower_band"]) / band_range if band_range > 0 else 0.5
        
        # BULLISH signals
        if position < 0.3:  # In lower 30% of band
            if tick_trend > self.MIN_TICK_MOMENTUM:
                confidence = 0.55 + (abs(tick_trend) * 50)
                signal = Signal.RISE
                reason = f"Lower band + uptick ({tick_trend:.5f})"
            else:
                confidence = 0.45
                signal = Signal.RISE
                reason = "Near lower band, mean reversion expected"
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"position": position, "bands": bb}
            )
        
        # BEARISH signals
        elif position > 0.7:  # In upper 30% of band
            if tick_trend < -self.MIN_TICK_MOMENTUM:
                confidence = 0.55 + (abs(tick_trend) * 50)
                signal = Signal.FALL
                reason = f"Upper band + downtick ({abs(tick_trend):.5f})"
            else:
                confidence = 0.45
                signal = Signal.FALL
                reason = "Near upper band, mean reversion expected"
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"position": position, "bands": bb}
            )
        
        # Middle band - no signal
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason=f"Price in middle band (position: {position:.2f})",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"position": position, "bands": bb}
        )

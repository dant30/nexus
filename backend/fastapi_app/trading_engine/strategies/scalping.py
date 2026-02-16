"""
Scalping trading strategy for fast, small-profit trades.
Balanced for quality signals with confirmation.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class ScalpingStrategy(BaseStrategy):
    """
    Scalping Strategy - Quality over quantity.
    """
    
    BB_PERIOD = 20  # Back to standard for stability
    BB_STD_DEV = 2.0  # Standard bands
    TICK_MOMENTUM_PERIOD = 3  # More ticks for confirmation
    MIN_TICK_MOMENTUM = 0.00008  # Balanced momentum requirement
    MIN_CONFIDENCE_THRESHOLD = 0.55  # Higher threshold
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        if not candles or len(candles) < self.BB_PERIOD:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Insufficient candles",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        if not ticks or len(ticks) < 5:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Insufficient ticks",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        closes = [float(c["close"]) for c in candles]
        current = closes[-1]
        
        # Get recent ticks with more data points
        recent_ticks = [float(t["price"]) if isinstance(t, dict) else float(t) 
                       for t in ticks[-5:]]

        # Calculate multiple momentum signals
        tick_trend_3 = recent_ticks[-1] - recent_ticks[-3] if len(recent_ticks) >= 3 else 0
        tick_trend_5 = recent_ticks[-1] - recent_ticks[0] if len(recent_ticks) >= 5 else tick_trend_3
        
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

        # Check for strong momentum
        strong_up_momentum = tick_trend_3 > self.MIN_TICK_MOMENTUM * 2
        strong_down_momentum = tick_trend_3 < -self.MIN_TICK_MOMENTUM * 2
        
        # BULLISH signals - require strong confirmation
        if position < 0.25:  # In lower 25% of band
            if strong_up_momentum:
                confidence = 0.65 + (abs(tick_trend_3) * 40)
                signal = Signal.RISE
                reason = "Strong bounce from lower band + momentum"
            elif tick_trend_3 > self.MIN_TICK_MOMENTUM:
                confidence = 0.55
                signal = Signal.RISE
                reason = "Lower band bounce with momentum"
            else:
                signal = Signal.HOLD
                reason = "At lower band, waiting for confirmation"
                confidence = 0.40
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"position": position, "momentum": tick_trend_3}
            )
        
        # BEARISH signals - require strong confirmation
        elif position > 0.75:  # In upper 25% of band
            if strong_down_momentum:
                confidence = 0.65 + (abs(tick_trend_3) * 40)
                signal = Signal.FALL
                reason = "Strong reversal from upper band + momentum"
            elif tick_trend_3 < -self.MIN_TICK_MOMENTUM:
                confidence = 0.55
                signal = Signal.FALL
                reason = "Upper band reversal with momentum"
            else:
                signal = Signal.HOLD
                reason = "At upper band, waiting for confirmation"
                confidence = 0.40
            
            return StrategySignal(
                signal=signal,
                confidence=round(min(confidence, 0.90), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"position": position, "momentum": tick_trend_3}
            )
        
        # Middle band - no signal
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason="Price in middle band",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"position": position}
        )

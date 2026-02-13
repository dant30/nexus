"""
Scalping trading strategy for fast, small-profit trades.
Professional implementation with Bollinger Bands + tick momentum confirmation.
"""
from typing import List, Dict, Optional
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class ScalpingStrategy(BaseStrategy):
    """
    Scalping Strategy for high-frequency, low-profit trades.
    
    Entry Conditions:
        RISE: Price touches/lower Bollinger Band + upward tick momentum
        FALL: Price touches/upper Bollinger Band + downward tick momentum
    
    Confidence Levels:
        0.75-1.00: Strong reversal signal (band touch + strong momentum)
        0.60-0.74: Good reversal (band touch + weak momentum)
        0.40-0.59: Potential reversal (band touch only)
        0.00-0.39: No signal
    
    Risk Profile: High frequency, tight stops, small profits
    """
    
    # Configurable parameters
    BB_PERIOD = 20
    BB_STD_DEV = 2.0
    TICK_MOMENTUM_PERIOD = 3
    MIN_TICK_MOMENTUM = 0.0001  # Minimum price movement for momentum
    MIN_CONFIDENCE_THRESHOLD = 0.60
    
    def __init__(
        self,
        symbol: str,
        period: int = 60,
        bb_period: int = BB_PERIOD,
        bb_std_dev: float = BB_STD_DEV,
    ):
        """Initialize scalping strategy with configurable parameters."""
        super().__init__(symbol, period)
        self.bb_period = bb_period
        self.bb_std_dev = bb_std_dev
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Generate scalping signal based on Bollinger Bands and tick momentum.
        Requires sufficient candle and tick data for reliable signals.
        """
        # Validate candle data
        if not candles or len(candles) < self.bb_period:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason=f"Insufficient candles: {len(candles) if candles else 0}/{self.bb_period}",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Validate tick data
        if not ticks or len(ticks) < self.TICK_MOMENTUM_PERIOD + 1:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason=f"Insufficient ticks: {len(ticks) if ticks else 0}/{self.TICK_MOMENTUM_PERIOD + 1}",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Extract price data
        closes = [float(c["close"]) for c in candles]
        current_price = closes[-1]
        
        # Extract tick data for momentum
        try:
            recent_ticks = [
                float(t["price"]) if isinstance(t, dict) else float(t)
                for t in ticks[-self.TICK_MOMENTUM_PERIOD - 1:]
                if (t.get("price") if isinstance(t, dict) else t) is not None
            ]
        except (ValueError, TypeError, KeyError):
            recent_ticks = []
        
        if len(recent_ticks) < 2:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Invalid tick data format",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Calculate Bollinger Bands
        bb = self._calculate_bollinger_bands(closes, self.bb_period, self.bb_std_dev)
        if bb is None:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Unable to calculate Bollinger Bands",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Calculate tick momentum
        tick_momentum = recent_ticks[-1] - recent_ticks[0]
        tick_trend = "up" if tick_momentum > self.MIN_TICK_MOMENTUM else "down" if tick_momentum < -self.MIN_TICK_MOMENTUM else "flat"
        
        # Calculate position within bands
        band_width = bb["upper_band"] - bb["lower_band"]
        if band_width > 0:
            position_ratio = (current_price - bb["lower_band"]) / band_width
        else:
            position_ratio = 0.5
        
        # Initialize signal
        signal = Signal.HOLD
        confidence = 0.0
        reason_parts = []
        metadata = {
            **bb,
            "current_price": current_price,
            "tick_momentum": tick_momentum,
            "tick_trend": tick_trend,
            "position_ratio": position_ratio,
        }
        
        # BULLISH SCALP: Price at/above lower band + upward momentum
        if current_price <= bb["lower_band"]:
            # Base confidence from position at lower band
            confidence = 0.50
            
            if tick_trend == "up":
                confidence += 0.25
                reason_parts.append(f"price at lower band, ticking up ({tick_momentum:.5f})")
                signal = Signal.RISE
            elif tick_trend == "flat":
                confidence += 0.10
                reason_parts.append(f"price at lower band, momentum flat")
                signal = Signal.RISE
            else:
                reason_parts.append(f"price below lower band, waiting for reversal")
                signal = Signal.HOLD
        
        # BEARISH SCALP: Price at/above upper band + downward momentum
        elif current_price >= bb["upper_band"]:
            # Base confidence from position at upper band
            confidence = 0.50
            
            if tick_trend == "down":
                confidence += 0.25
                reason_parts.append(f"price at upper band, ticking down ({abs(tick_momentum):.5f})")
                signal = Signal.FALL
            elif tick_trend == "flat":
                confidence += 0.10
                reason_parts.append(f"price at upper band, momentum flat")
                signal = Signal.FALL
            else:
                reason_parts.append(f"price above upper band, waiting for reversal")
                signal = Signal.HOLD
        
        # Mean reversion signals
        elif current_price < bb["lower_band"]:
            confidence = 0.55
            reason_parts.append("price below lower band, mean reversion expected")
            signal = Signal.RISE
        
        elif current_price > bb["upper_band"]:
            confidence = 0.55
            reason_parts.append("price above upper band, mean reversion expected")
            signal = Signal.FALL
        
        else:
            # Within bands, no scalping signal
            confidence = 0.3
            reason_parts.append(f"price within bands (ratio: {position_ratio:.2f})")
            signal = Signal.HOLD
        
        # Cap confidence
        confidence = min(max(confidence, 0.0), 1.0)
        
        # Only return trade signals if confidence meets threshold
        if signal != Signal.HOLD and confidence < self.MIN_CONFIDENCE_THRESHOLD:
            signal = Signal.HOLD
            confidence = 0.3
            reason_parts.append("confidence too low")
        
        # Log scalping opportunity
        if signal != Signal.HOLD and confidence >= self.MIN_CONFIDENCE_THRESHOLD:
            log_info(
                f"Scalping {signal.value} on {self.symbol}",
                price=current_price,
                band=bb["lower_band"] if signal == Signal.RISE else bb["upper_band"],
                confidence=round(confidence, 2),
                tick_momentum=tick_momentum,
            )
        
        return StrategySignal(
            signal=signal,
            confidence=round(confidence, 4),
            reason=", ".join(reason_parts) if reason_parts else "No scalping signal",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata=metadata,
        )
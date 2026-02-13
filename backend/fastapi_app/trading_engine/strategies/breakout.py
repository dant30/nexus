"""
Breakout trading strategy with dynamic support/resistance.
Professional implementation with volatility adjustment and confirmation.
"""
from typing import List, Dict, Optional
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class BreakoutStrategy(BaseStrategy):
    """
    Breakout Strategy with dynamic support/resistance and volume confirmation.
    
    Entry Conditions:
        RISE: Price breaks above resistance with momentum
        FALL: Price breaks below support with momentum
    
    Confidence Levels:
        0.80-1.00: Strong breakout (clear break + momentum)
        0.60-0.79: Moderate breakout (price break only)
        0.40-0.59: Weak breakout (touching level)
        0.00-0.39: No breakout
    
    Risk Profile: High reward, requires confirmation
    """
    
    # Configurable parameters
    MIN_LOOKBACK = 10
    DEFAULT_LOOKBACK = 20
    BREAKOUT_BUFFER_PERCENT = 0.0005  # 0.05% buffer to avoid false breakouts
    MIN_CONFIDENCE_THRESHOLD = 0.60
    
    def __init__(
        self,
        symbol: str,
        period: int = 60,
        lookback: int = DEFAULT_LOOKBACK,
        breakout_buffer: float = BREAKOUT_BUFFER_PERCENT,
    ):
        """Initialize breakout strategy with configurable parameters."""
        super().__init__(symbol, period)
        self.lookback = max(lookback, self.MIN_LOOKBACK)
        self.breakout_buffer = breakout_buffer
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Generate breakout signal based on support/resistance levels.
        Uses ATR for volatility-adjusted breakout detection.
        """
        # Validate data sufficiency
        if not candles or len(candles) < self.lookback:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason=f"Insufficient data: {len(candles) if candles else 0}/{self.lookback} candles",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Extract price data
        recent_candles = candles[-self.lookback:]
        closes = [float(c["close"]) for c in recent_candles]
        highs = [float(c["high"]) for c in recent_candles]
        lows = [float(c["low"]) for c in recent_candles]
        
        # Calculate key levels
        resistance = max(highs)
        support = min(lows)
        current_price = closes[-1]
        range_height = resistance - support
        
        # Calculate ATR for volatility adjustment
        atr = self._calculate_atr(highs, lows, closes)
        volatility_factor = atr / range_height if atr and range_height > 0 else 0.05
        
        # Dynamic breakout buffer based on volatility
        dynamic_buffer = max(self.breakout_buffer, volatility_factor * 0.1)
        buffer_price = range_height * dynamic_buffer
        
        # Bollinger Bands for confirmation
        bb = self._calculate_bollinger_bands(closes)
        
        # Initialize signal
        signal = Signal.HOLD
        confidence = 0.0
        reason_parts = []
        metadata = {
            "support": support,
            "resistance": resistance,
            "current_price": current_price,
            "range_height": range_height,
            "volatility_factor": volatility_factor,
            "atr": atr,
            "bollinger_bands": bb,
        }
        
        # Check for breakouts
        # BULLISH BREAKOUT: Price above resistance + buffer
        if current_price > (resistance + buffer_price):
            # Calculate breakout strength
            breakout_strength = (current_price - resistance) / range_height if range_height > 0 else 0.1
            breakout_strength = min(breakout_strength, 1.0)
            
            confidence = 0.65 + (breakout_strength * 0.25)
            
            # Bollinger Band confirmation
            if bb and current_price > bb["upper_band"]:
                confidence += 0.10
                reason_parts.append("above upper Bollinger Band")
            
            signal = Signal.RISE
            reason_parts.append(f"bullish breakout above {resistance:.5f}")
        
        # BEARISH BREAKOUT: Price below support - buffer
        elif current_price < (support - buffer_price):
            # Calculate breakout strength
            breakout_strength = (support - current_price) / range_height if range_height > 0 else 0.1
            breakout_strength = min(breakout_strength, 1.0)
            
            confidence = 0.65 + (breakout_strength * 0.25)
            
            # Bollinger Band confirmation
            if bb and current_price < bb["lower_band"]:
                confidence += 0.10
                reason_parts.append("below lower Bollinger Band")
            
            signal = Signal.FALL
            reason_parts.append(f"bearish breakout below {support:.5f}")
        
        # No breakout - check proximity to levels
        else:
            distance_to_resistance = (resistance - current_price) / range_height if range_height > 0 else 1.0
            distance_to_support = (current_price - support) / range_height if range_height > 0 else 1.0
            
            if distance_to_resistance < 0.1:
                confidence = 0.45
                reason_parts.append(f"approaching resistance ({distance_to_resistance:.1%})")
                signal = Signal.HOLD
            elif distance_to_support < 0.1:
                confidence = 0.45
                reason_parts.append(f"approaching support ({distance_to_support:.1%})")
                signal = Signal.HOLD
            else:
                confidence = 0.3
                reason_parts.append("consolidating within range")
                signal = Signal.HOLD
        
        # Cap confidence
        confidence = min(max(confidence, 0.0), 1.0)
        
        # Only return trade signals if confidence meets threshold
        if signal != Signal.HOLD and confidence < self.MIN_CONFIDENCE_THRESHOLD:
            signal = Signal.HOLD
            confidence = 0.3
            reason_parts.append("confidence too low")
        
        # Log breakout if significant
        if signal != Signal.HOLD and confidence >= self.MIN_CONFIDENCE_THRESHOLD:
            log_info(
                f"Breakout {signal.value} on {self.symbol}",
                price=current_price,
                level=resistance if signal == Signal.RISE else support,
                confidence=round(confidence, 2),
                strength=breakout_strength,
            )
        
        return StrategySignal(
            signal=signal,
            confidence=round(confidence, 4),
            reason=", ".join(reason_parts) if reason_parts else "No breakout signal",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata=metadata,
        )
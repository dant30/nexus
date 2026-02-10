"""
Breakout trading strategy.
Identifies support/resistance levels and trades breakouts.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class BreakoutStrategy(BaseStrategy):
    """
    Breakout Strategy:
    - Identifies support and resistance levels
    - Enters when price breaks through levels
    - High probability high-risk trades
    
    Confidence:
    - High (0.8-1.0): Strong breakout with volume
    - Medium (0.6-0.8): Breakout without strong confirmation
    - Low (0.4-0.6): Weak breakout signal
    """
    
    def __init__(self, symbol: str, period: int = 60, lookback: int = 20):
        """
        Initialize breakout strategy.
        
        Args:
        - symbol: Trading symbol
        - period: Candle period
        - lookback: Number of candles to find support/resistance
        """
        super().__init__(symbol, period)
        self.lookback = lookback
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Analyze for breakout signals.
        """
        if not candles or len(candles) < self.lookback:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Not enough candle data",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        # Get recent candles
        recent_candles = candles[-self.lookback:]
        closes = [c["close"] for c in recent_candles]
        highs = [c["high"] for c in recent_candles]
        lows = [c["low"] for c in recent_candles]
        
        # Find support and resistance
        support = min(lows)
        resistance = max(highs)
        current_price = closes[-1]
        
        # Check for breakouts
        if current_price > resistance:
            # Breakout upward
            strength = (current_price - support) / (resistance - support)
            strength = min(strength, 1.0)  # Cap at 1.0
            
            confidence = 0.6 + (strength * 0.3)  # 0.6 to 0.9
            
            log_info(
                f"Breakout (BULLISH) detected on {self.symbol}",
                price=current_price,
                resistance=resistance,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=confidence,
                reason=f"Breakout above resistance {resistance:.5f}",
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "support": support,
                    "resistance": resistance,
                    "current_price": current_price,
                    "strength": strength,
                },
            )
        
        elif current_price < support:
            # Breakout downward
            strength = (resistance - current_price) / (resistance - support)
            strength = min(strength, 1.0)
            
            confidence = 0.6 + (strength * 0.3)
            
            log_info(
                f"Breakout (BEARISH) detected on {self.symbol}",
                price=current_price,
                support=support,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=confidence,
                reason=f"Breakout below support {support:.5f}",
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "support": support,
                    "resistance": resistance,
                    "current_price": current_price,
                    "strength": strength,
                },
            )
        
        else:
            # No breakout, consolidating
            distance_to_resistance = (resistance - current_price) / (resistance - support)
            distance_to_support = (current_price - support) / (resistance - support)
            
            if distance_to_resistance < 0.1:
                # Close to resistance
                confidence = 0.5
                reason = "Approaching resistance, potential breakout imminent"
            elif distance_to_support < 0.1:
                # Close to support
                confidence = 0.5
                reason = "Approaching support, potential breakout imminent"
            else:
                confidence = 0.3
                reason = "Consolidating within support/resistance"
            
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "support": support,
                    "resistance": resistance,
                    "current_price": current_price,
                },
            )

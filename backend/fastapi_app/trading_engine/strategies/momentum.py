"""
Momentum trading strategy with RSI and MACD.
Balanced for clearer signals without missing opportunities.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class MomentumStrategy(BaseStrategy):
    """
    Momentum Strategy - Balanced for clear signals.
    """
    
    # BALANCED THRESHOLDS
    OVERSOLD_THRESHOLD = 40  # Was 45 - stricter oversold
    OVERBOUGHT_THRESHOLD = 60  # Was 55 - stricter overbought
    MIN_CONFIDENCE_THRESHOLD = 0.50  # Was 0.40 - higher minimum
    STRONG_CONFIDENCE_THRESHOLD = 0.75  # Was 0.65 - stronger required
    
    def __init__(self, symbol: str, period: int = 60, rsi_period: int = 14):
        super().__init__(symbol, period)
        self.rsi_period = rsi_period
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        if not candles or len(candles) < self.rsi_period + 5:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0, 
                                 reason="Insufficient data", 
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)
        
        closes = [float(c["close"]) for c in candles]
        rsi = self._calculate_rsi(closes, self.rsi_period)
        
        if rsi is None:
            return StrategySignal(signal=Signal.HOLD, confidence=0.0,
                                 reason="Unable to calculate RSI",
                                 timestamp=datetime.utcnow().isoformat(),
                                 strategy=self.name)

        # Add MACD for confirmation
        macd_data = self._calculate_macd(closes)
        
        # RISE signal - strong oversold with confirmation
        if rsi <= self.OVERSOLD_THRESHOLD:
            rsi_strength = (self.OVERSOLD_THRESHOLD - rsi) / self.OVERSOLD_THRESHOLD
            confidence = 0.50 + (rsi_strength * 0.30)

            # MACD confirmation boost
            if macd_data and macd_data["histogram"] > 0:
                confidence += 0.15
                reason = f"RSI oversold ({rsi:.2f}) + MACD bullish"
            else:
                reason = f"RSI oversold ({rsi:.2f})"
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=round(min(confidence, 0.95), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"rsi": rsi, "macd": macd_data}
            )
        
        # FALL signal - strong overbought with confirmation
        elif rsi >= self.OVERBOUGHT_THRESHOLD:
            rsi_strength = (rsi - self.OVERBOUGHT_THRESHOLD) / (100 - self.OVERBOUGHT_THRESHOLD)
            confidence = 0.50 + (rsi_strength * 0.30)

            # MACD confirmation boost
            if macd_data and macd_data["histogram"] < 0:
                confidence += 0.15
                reason = f"RSI overbought ({rsi:.2f}) + MACD bearish"
            else:
                reason = f"RSI overbought ({rsi:.2f})"
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=round(min(confidence, 0.95), 4),
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"rsi": rsi, "macd": macd_data}
            )
        
        # Neutral
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason=f"RSI neutral ({rsi:.2f})",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"rsi": rsi}
        )

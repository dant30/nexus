"""
Momentum trading strategy with RSI and MACD.
Professional implementation with configurable thresholds and confirmation logic.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal


class MomentumStrategy(BaseStrategy):
    """
    Momentum Strategy with RSI and MACD.
    Now with lower thresholds to generate more signals.
    """
    
    # MORE SENSITIVE THRESHOLDS
    OVERSOLD_THRESHOLD = 45  # Was 35 - now catches more opportunities
    OVERBOUGHT_THRESHOLD = 55  # Was 65 - now catches more opportunities
    MIN_CONFIDENCE_THRESHOLD = 0.40  # Was 0.50
    STRONG_CONFIDENCE_THRESHOLD = 0.65  # Was 0.75
    
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
        
        # RISE signal - oversold
        if rsi <= self.OVERSOLD_THRESHOLD:
            # More aggressive confidence calculation
            rsi_strength = (self.OVERSOLD_THRESHOLD - rsi) / self.OVERSOLD_THRESHOLD
            confidence = 0.45 + (rsi_strength * 0.35)  # Was 0.50 + (rsi_strength * 0.30)
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=round(min(confidence, 0.90), 4),
                reason=f"RSI oversold ({rsi:.2f})",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"rsi": rsi}
            )
        
        # FALL signal - overbought
        elif rsi >= self.OVERBOUGHT_THRESHOLD:
            rsi_strength = (rsi - self.OVERBOUGHT_THRESHOLD) / (100 - self.OVERBOUGHT_THRESHOLD)
            confidence = 0.45 + (rsi_strength * 0.35)  # Was 0.50 + (rsi_strength * 0.30)
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=round(min(confidence, 0.90), 4),
                reason=f"RSI overbought ({rsi:.2f})",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
                metadata={"rsi": rsi}
            )
        
        # Neutral - still return HOLD but with low confidence
        return StrategySignal(
            signal=Signal.HOLD,
            confidence=0.30,
            reason=f"RSI neutral ({rsi:.2f})",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata={"rsi": rsi}
        )

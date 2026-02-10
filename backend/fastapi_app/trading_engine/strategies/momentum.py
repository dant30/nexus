"""
Momentum trading strategy.
Uses RSI and MACD to identify overbought/oversold conditions.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class MomentumStrategy(BaseStrategy):
    """
    Momentum Strategy:
    - Uses RSI for overbought/oversold signals
    - Confirms with MACD
    - Strong trend following strategy
    
    Signals:
    - RISE: RSI < 30 (oversold) + MACD bullish
    - FALL: RSI > 70 (overbought) + MACD bearish
    
    Confidence:
    - High (0.8-1.0): RSI + MACD agree strongly
    - Medium (0.6-0.8): One indicator strong signal
    - Low (0.4-0.6): Weak indications
    """
    
    def __init__(self, symbol: str, period: int = 60, rsi_period: int = 14):
        """
        Initialize momentum strategy.
        
        Args:
        - symbol: Trading symbol
        - period: Candle period
        - rsi_period: RSI calculation period
        """
        super().__init__(symbol, period)
        self.rsi_period = rsi_period
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Analyze for momentum signals.
        """
        if not candles or len(candles) < self.rsi_period + 1:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Not enough candle data",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        # Extract price data
        closes = [c["close"] for c in candles]
        
        # Calculate RSI
        rsi = self._calculate_rsi(closes, self.rsi_period)
        if rsi is None:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Unable to calculate RSI",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        # Calculate MACD
        macd_data = self._calculate_macd(closes)
        
        current_price = closes[-1]
        
        # Generate signals based on RSI
        if rsi < 30:  # Oversold
            confidence = 0.6
            reason = f"RSI oversold ({rsi:.2f})"
            
            # Increase confidence if MACD is bullish
            if macd_data and macd_data["histogram"] > 0:
                confidence = 0.85
                reason += ", MACD bullish"
            
            log_info(
                f"Momentum (BULLISH) on {self.symbol}",
                rsi=rsi,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "rsi": rsi,
                    "macd": macd_data,
                    "current_price": current_price,
                },
            )
        
        elif rsi > 70:  # Overbought
            confidence = 0.6
            reason = f"RSI overbought ({rsi:.2f})"
            
            # Increase confidence if MACD is bearish
            if macd_data and macd_data["histogram"] < 0:
                confidence = 0.85
                reason += ", MACD bearish"
            
            log_info(
                f"Momentum (BEARISH) on {self.symbol}",
                rsi=rsi,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "rsi": rsi,
                    "macd": macd_data,
                    "current_price": current_price,
                },
            )
        
        else:  # Neutral
            confidence = 0.4
            if macd_data:
                if macd_data["histogram"] > 0:
                    reason = "Neutral RSI, MACD bullish"
                    signal = Signal.RISE
                    confidence = 0.5
                elif macd_data["histogram"] < 0:
                    reason = "Neutral RSI, MACD bearish"
                    signal = Signal.FALL
                    confidence = 0.5
                else:
                    reason = "No clear momentum signal"
                    signal = Signal.HOLD
            else:
                reason = "No clear momentum signal"
                signal = Signal.HOLD
            
            return StrategySignal(
                signal=signal,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "rsi": rsi,
                    "macd": macd_data,
                    "current_price": current_price,
                },
            )

"""
Momentum trading strategy with RSI and MACD.
Professional implementation with configurable thresholds and confirmation logic.
"""
from typing import List, Dict, Optional
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class MomentumStrategy(BaseStrategy):
    """
    Momentum Strategy with RSI + MACD confirmation.
    
    Entry Conditions:
        RISE: RSI < 30 (oversold) AND MACD histogram > 0
        FALL: RSI > 70 (overbought) AND MACD histogram < 0
    
    Confidence Levels:
        0.85-1.00: Strong signal (both indicators agree strongly)
        0.70-0.84: Good signal (clear RSI + MACD agreement)
        0.50-0.69: Weak signal (one indicator only)
        0.00-0.49: No signal
    
    Risk Profile: Medium, good for trending markets
    """
    
    # Configurable thresholds
    OVERSOLD_THRESHOLD = 35  # More sensitive than default 30
    OVERBOUGHT_THRESHOLD = 65  # More sensitive than default 70
    MIN_CONFIDENCE_THRESHOLD = 0.50
    STRONG_CONFIDENCE_THRESHOLD = 0.75
    
    def __init__(
        self,
        symbol: str,
        period: int = 60,
        rsi_period: int = 14,
        macd_fast: int = 12,
        macd_slow: int = 26,
        macd_signal: int = 9,
    ):
        """Initialize momentum strategy with configurable parameters."""
        super().__init__(symbol, period)
        self.rsi_period = rsi_period
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal = macd_signal
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Generate momentum signal based on RSI and MACD.
        Requires at least rsi_period + 5 candles for reliable signals.
        """
        # Validate data sufficiency
        min_required_candles = self.rsi_period + 5
        if not candles or len(candles) < min_required_candles:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason=f"Insufficient data: {len(candles) if candles else 0}/{min_required_candles} candles",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Extract price data
        closes = [float(c["close"]) for c in candles]
        
        # Calculate indicators
        rsi = self._calculate_rsi(closes, self.rsi_period)
        macd_data = self._calculate_macd(
            closes,
            self.macd_fast,
            self.macd_slow,
            self.macd_signal,
        )
        
        current_price = closes[-1]
        
        # Handle missing indicators
        if rsi is None:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Unable to calculate RSI",
                timestamp=datetime.utcnow().isoformat(),
                strategy=self.name,
            )
        
        # Determine signal based on RSI
        signal = Signal.HOLD
        confidence = 0.0
        reason_parts = []
        metadata = {
            "rsi": rsi,
            "current_price": current_price,
            "macd": macd_data,
        }
        
        # RISE conditions (oversold)
        if rsi <= self.OVERSOLD_THRESHOLD:
            reason_parts.append(f"RSI oversold ({rsi:.2f})")
            
            # Base confidence from RSI oversold strength
            # More oversold = higher confidence
            rsi_strength = (self.OVERSOLD_THRESHOLD - rsi) / self.OVERSOLD_THRESHOLD
            confidence = 0.50 + (rsi_strength * 0.30)
            
            # MACD confirmation
            if macd_data and macd_data["histogram"] > 0:
                confidence += 0.20
                reason_parts.append("MACD bullish")
            
            signal = Signal.RISE
        
        # FALL conditions (overbought)
        elif rsi >= self.OVERBOUGHT_THRESHOLD:
            reason_parts.append(f"RSI overbought ({rsi:.2f})")
            
            # Base confidence from RSI overbought strength
            rsi_strength = (rsi - self.OVERBOUGHT_THRESHOLD) / (100 - self.OVERBOUGHT_THRESHOLD)
            confidence = 0.50 + (rsi_strength * 0.30)
            
            # MACD confirmation
            if macd_data and macd_data["histogram"] < 0:
                confidence += 0.20
                reason_parts.append("MACD bearish")
            
            signal = Signal.FALL
        
        # Neutral RSI, check MACD only
        elif macd_data:
            if macd_data["histogram"] > 0.0005:  # Bullish but weak
                signal = Signal.RISE
                confidence = 0.45
                reason_parts.append(f"Neutral RSI ({rsi:.2f}), MACD bullish")
            elif macd_data["histogram"] < -0.0005:  # Bearish but weak
                signal = Signal.FALL
                confidence = 0.45
                reason_parts.append(f"Neutral RSI ({rsi:.2f}), MACD bearish")
            else:
                reason_parts.append(f"RSI neutral ({rsi:.2f}), no clear momentum")
        else:
            reason_parts.append(f"No clear momentum signal")
        
        # Cap confidence
        confidence = min(max(confidence, 0.0), 1.0)
        
        # Only return non-HOLD signals if confidence meets threshold
        if signal != Signal.HOLD and confidence < self.MIN_CONFIDENCE_THRESHOLD:
            signal = Signal.HOLD
            confidence = 0.3
            reason_parts.append("Confidence too low")
        
        # Log signal generation
        if signal != Signal.HOLD:
            log_info(
                f"Momentum {signal.value} on {self.symbol}",
                rsi=rsi,
                confidence=round(confidence, 2),
                macd_histogram=macd_data["histogram"] if macd_data else None,
            )
        
        return StrategySignal(
            signal=signal,
            confidence=round(confidence, 4),
            reason=", ".join(reason_parts) if reason_parts else "No clear signal",
            timestamp=datetime.utcnow().isoformat(),
            strategy=self.name,
            metadata=metadata,
        )
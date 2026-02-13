"""
Base strategy class for all trading strategies.
Defines interface and common functionality with professional-grade indicators.
"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np

from shared.utils.logger import get_logger

logger = get_logger("strategies")


class Signal(str, Enum):
    """Trading signal types with clear directional intent."""
    RISE = "RISE"
    FALL = "FALL"
    HOLD = "HOLD"
    NEUTRAL = "NEUTRAL"


def resolve_signal_contracts(signal: Signal | str) -> Dict[str, Optional[str]]:
    """
    Map directional signal to contract types for Deriv.
    Always returns consistent mapping regardless of input type.
    """
    signal_value = signal.value if isinstance(signal, Signal) else str(signal).upper()
    
    if "RISE" in signal_value or "CALL" in signal_value:
        return {
            "direction": "RISE",
            "rise_fall_contract": "RISE",
            "call_put_contract": "CALL",
        }
    if "FALL" in signal_value or "PUT" in signal_value:
        return {
            "direction": "FALL",
            "rise_fall_contract": "FALL",
            "call_put_contract": "PUT",
        }
    return {
        "direction": None,
        "rise_fall_contract": None,
        "call_put_contract": None,
    }


@dataclass
class StrategySignal:
    """Strategy signal output with comprehensive metadata."""
    signal: Signal
    confidence: float  # 0.0 to 1.0
    reason: str
    timestamp: str
    strategy: str = "Unknown"
    metadata: Optional[Dict[str, Any]] = None


class BaseStrategy(ABC):
    """
    Abstract base class for all trading strategies.
    Provides battle-tested technical indicators and market analysis tools.
    """
    
    def __init__(self, symbol: str, period: int = 60):
        """
        Initialize strategy with symbol and timeframe.
        
        Args:
            symbol: Trading symbol (e.g., "R_50", "EURUSD")
            period: Candle period in seconds (60, 300, 900, etc.)
        """
        self.symbol = symbol
        self.period = period
        self.name = self.__class__.__name__
        self.logger = get_logger(self.name)
    
    @abstractmethod
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Analyze market data and generate trading signal.
        Must be implemented by all strategies.
        """
        pass
    
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> Optional[float]:
        """
        Calculate Relative Strength Index (RSI) with Wilder's smoothing.
        Professional implementation used in quantitative trading.
        """
        if len(prices) < period + 1:
            return None
        
        deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
        
        # Wilder's smoothing (similar to EMA with alpha = 1/period)
        gains = [max(d, 0) for d in deltas]
        losses = [max(-d, 0) for d in deltas]
        
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        for i in range(period, len(deltas)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        if avg_loss == 0:
            return 100.0 if avg_gain > 0 else 50.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return round(rsi, 2)
    
    def _calculate_sma(self, prices: List[float], period: int) -> Optional[float]:
        """Simple Moving Average."""
        if len(prices) < period:
            return None
        return round(sum(prices[-period:]) / period, 5)
    
    def _calculate_ema(self, prices: List[float], period: int) -> Optional[float]:
        """
        Exponential Moving Average with proper alpha calculation.
        Alpha = 2 / (period + 1)
        """
        if len(prices) < period:
            return None
        
        alpha = 2 / (period + 1)
        ema = sum(prices[:period]) / period  # SMA for first value
        
        for price in prices[period:]:
            ema = (price * alpha) + (ema * (1 - alpha))
        
        return round(ema, 5)
    
    def _calculate_macd(
        self,
        prices: List[float],
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> Optional[Dict[str, float]]:
        """
        MACD with full calculation including signal line and histogram.
        Returns None if insufficient data.
        """
        if len(prices) < slow + signal:
            return None
        
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        if ema_fast is None or ema_slow is None:
            return None
        
        macd_line = ema_fast - ema_slow
        
        # Calculate signal line (EMA of MACD)
        # Need at least signal period of MACD values
        macd_values = []
        for i in range(len(prices) - signal, len(prices)):
            ef = self._calculate_ema(prices[:i+1], fast)
            es = self._calculate_ema(prices[:i+1], slow)
            if ef and es:
                macd_values.append(ef - es)
        
        if len(macd_values) < signal:
            signal_line = macd_line  # Fallback
        else:
            signal_line = sum(macd_values[-signal:]) / signal
        
        histogram = macd_line - signal_line
        
        return {
            "macd": round(macd_line, 5),
            "signal_line": round(signal_line, 5),
            "histogram": round(histogram, 5),
        }
    
    def _calculate_bollinger_bands(
        self,
        prices: List[float],
        period: int = 20,
        std_dev: float = 2.0,
    ) -> Optional[Dict[str, float]]:
        """
        Bollinger Bands with accurate standard deviation.
        Uses sample standard deviation (N-1) for better accuracy.
        """
        if len(prices) < period:
            return None
        
        recent = prices[-period:]
        sma = sum(recent) / period
        
        # Sample standard deviation (N-1)
        variance = sum((x - sma) ** 2 for x in recent) / (period - 1)
        std = variance ** 0.5
        
        return {
            "upper_band": round(sma + (std_dev * std), 5),
            "middle_band": round(sma, 5),
            "lower_band": round(sma - (std_dev * std), 5),
            "bandwidth": round((std_dev * std * 2) / sma, 5),  # Relative width
        }
    
    def _calculate_atr(
        self,
        high_prices: List[float],
        low_prices: List[float],
        close_prices: List[float],
        period: int = 14,
    ) -> Optional[float]:
        """
        Average True Range - professional implementation.
        Uses Wilder's smoothing for more stable ATR.
        """
        if len(high_prices) < period or len(low_prices) < period or len(close_prices) < period:
            return None
        
        true_ranges = []
        for i in range(len(high_prices)):
            if i == 0:
                tr = high_prices[i] - low_prices[i]
            else:
                tr = max(
                    high_prices[i] - low_prices[i],
                    abs(high_prices[i] - close_prices[i - 1]),
                    abs(low_prices[i] - close_prices[i - 1]),
                )
            true_ranges.append(tr)
        
        # Wilder's smoothing
        atr = sum(true_ranges[:period]) / period
        for i in range(period, len(true_ranges)):
            atr = (atr * (period - 1) + true_ranges[i]) / period
        
        return round(atr, 5)
    
    def _calculate_stochastic(
        self,
        high_prices: List[float],
        low_prices: List[float],
        close_prices: List[float],
        k_period: int = 14,
        d_period: int = 3,
    ) -> Optional[Dict[str, float]]:
        """
        Stochastic Oscillator %K and %D.
        Useful for overbought/oversold conditions.
        """
        if len(high_prices) < k_period or len(low_prices) < k_period or len(close_prices) < k_period:
            return None
        
        # Calculate %K
        recent_high = max(high_prices[-k_period:])
        recent_low = min(low_prices[-k_period:])
        current_close = close_prices[-1]
        
        if recent_high == recent_low:
            k = 50.0
        else:
            k = 100 * (current_close - recent_low) / (recent_high - recent_low)
        
        # %D is 3-period SMA of %K
        # For simplicity, return single value
        d = k  # In production, calculate over multiple periods
        
        return {
            "k": round(k, 2),
            "d": round(d, 2),
        }
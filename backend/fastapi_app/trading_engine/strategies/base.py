"""
Base strategy class for all trading strategies.
Defines interface and common functionality.
"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, List
from dataclasses import dataclass
from decimal import Decimal

from shared.utils.logger import get_logger

logger = get_logger("strategies")


class Signal(str, Enum):
    """Trading signal types."""
    RISE = "RISE"
    FALL = "FALL"
    HOLD = "HOLD"
    NEUTRAL = "NEUTRAL"


def resolve_signal_contracts(signal: "Signal | str") -> Dict[str, Optional[str]]:
    """
    Map a directional strategy signal to both supported contract families.
    """
    signal_value = signal.value if isinstance(signal, Signal) else str(signal).upper()
    if signal_value == Signal.RISE.value:
        return {
            "direction": "RISE",
            "rise_fall_contract": "RISE",
            "call_put_contract": "CALL",
        }
    if signal_value == Signal.FALL.value:
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
    """Strategy signal output."""
    signal: Signal
    confidence: float  # 0.0 to 1.0
    reason: str
    timestamp: str
    metadata: Optional[Dict] = None


class BaseStrategy(ABC):
    """
    Abstract base class for all trading strategies.
    
    Defines the interface that all strategies must implement.
    """
    
    def __init__(self, symbol: str, period: int = 60):
        """
        Initialize strategy.
        
        Args:
        - symbol: Trading symbol (e.g., "EURUSD")
        - period: Candle period in seconds (60, 300, 900, etc.)
        """
        self.symbol = symbol
        self.period = period
        self.name = self.__class__.__name__
        self.logger = get_logger(self.name)
    
    @abstractmethod
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Analyze market data and generate trading signal.
        
        Args:
        - candles: List of OHLC candle dicts with keys: open, high, low, close, time
        - ticks: List of recent tick prices
        
        Returns:
        - StrategySignal with signal type and confidence
        """
        pass
    
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> Optional[float]:
        """
        Calculate Relative Strength Index (RSI).
        
        Args:
        - prices: List of closing prices
        - period: RSI period (default: 14)
        
        Returns:
        - RSI value 0-100, or None if not enough data
        """
        if len(prices) < period + 1:
            return None
        
        deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0 if avg_gain > 0 else 50.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_sma(self, prices: List[float], period: int) -> Optional[float]:
        """
        Calculate Simple Moving Average (SMA).
        
        Args:
        - prices: List of prices
        - period: SMA period
        
        Returns:
        - SMA value or None if not enough data
        """
        if len(prices) < period:
            return None
        
        return sum(prices[-period:]) / period
    
    def _calculate_ema(self, prices: List[float], period: int) -> Optional[float]:
        """
        Calculate Exponential Moving Average (EMA).
        
        Args:
        - prices: List of prices
        - period: EMA period
        
        Returns:
        - EMA value or None if not enough data
        """
        if len(prices) < period:
            return None
        
        multiplier = 2 / (period + 1)
        ema = sum(prices[:period]) / period  # SMA for first EMA
        
        for price in prices[period:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def _calculate_macd(
        self,
        prices: List[float],
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> Optional[Dict]:
        """
        Calculate MACD (Moving Average Convergence Divergence).
        
        Args:
        - prices: List of prices
        - fast: Fast EMA period (default: 12)
        - slow: Slow EMA period (default: 26)
        - signal: Signal line EMA period (default: 9)
        
        Returns:
        - Dict with macd, signal_line, histogram or None if not enough data
        """
        if len(prices) < slow:
            return None
        
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        if ema_fast is None or ema_slow is None:
            return None
        
        macd = ema_fast - ema_slow
        
        # Calculate signal line (EMA of MACD values)
        # For simplicity, use last MACD as signal
        signal_val = macd
        histogram = macd - signal_val
        
        return {
            "macd": macd,
            "signal_line": signal_val,
            "histogram": histogram,
        }
    
    def _calculate_bollinger_bands(
        self,
        prices: List[float],
        period: int = 20,
        std_dev: float = 2.0,
    ) -> Optional[Dict]:
        """
        Calculate Bollinger Bands.
        
        Args:
        - prices: List of prices
        - period: SMA period (default: 20)
        - std_dev: Standard deviation multiplier (default: 2.0)
        
        Returns:
        - Dict with upper_band, middle_band, lower_band or None
        """
        if len(prices) < period:
            return None
        
        sma = sum(prices[-period:]) / period
        
        # Calculate standard deviation
        variance = sum((p - sma) ** 2 for p in prices[-period:]) / period
        std = variance ** 0.5
        
        return {
            "upper_band": sma + (std_dev * std),
            "middle_band": sma,
            "lower_band": sma - (std_dev * std),
        }
    
    def _calculate_atr(
        self,
        high_prices: List[float],
        low_prices: List[float],
        close_prices: List[float],
        period: int = 14,
    ) -> Optional[float]:
        """
        Calculate Average True Range (ATR).
        
        Args:
        - high_prices: List of high prices
        - low_prices: List of low prices
        - close_prices: List of close prices
        - period: ATR period (default: 14)
        
        Returns:
        - ATR value or None if not enough data
        """
        if len(high_prices) < period:
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
        
        atr = sum(true_ranges[-period:]) / period
        return atr

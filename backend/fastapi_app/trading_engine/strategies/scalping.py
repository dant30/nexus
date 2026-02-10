"""
Scalping trading strategy.
Fast, high-frequency trades on small price movements.
"""
from typing import List, Dict
from datetime import datetime

from .base import BaseStrategy, Signal, StrategySignal
from shared.utils.logger import log_info


class ScalpingStrategy(BaseStrategy):
    """
    Scalping Strategy:
    - Uses Bollinger Bands and quick price action
    - Looks for fast price reversals
    - Small profit targets, tight stops
    
    Signals:
    - RISE: Price touches lower Bollinger Band
    - FALL: Price touches upper Bollinger Band
    
    Risk Profile:
    - High frequency, small wins
    - Requires tight risk management
    - Best on 60-second candles
    """
    
    def __init__(self, symbol: str, period: int = 60, bb_period: int = 20):
        """
        Initialize scalping strategy.
        
        Args:
        - symbol: Trading symbol
        - period: Candle period (60s optimal)
        - bb_period: Bollinger Bands period
        """
        super().__init__(symbol, period)
        self.bb_period = bb_period
    
    async def analyze(self, candles: List[Dict], ticks: List[Dict]) -> StrategySignal:
        """
        Analyze for scalping signals.
        """
        if not candles or len(candles) < self.bb_period:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Not enough candle data",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        if not ticks or len(ticks) < 5:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Not enough tick data",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        # Extract price data
        closes = [c["close"] for c in candles]
        current_price = closes[-1]
        
        # Get recent ticks for micro-trends
        recent_ticks = [
            float(t.get("price")) if isinstance(t, dict) else float(t)
            for t in ticks[-5:]
            if (t.get("price") if isinstance(t, dict) else t) is not None
        ]
        if len(recent_ticks) < 2:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Not enough tick data",
                timestamp=datetime.utcnow().isoformat(),
            )
        tick_trend = recent_ticks[-1] - recent_ticks[0]  # Latest tick direction
        
        # Calculate Bollinger Bands
        bb = self._calculate_bollinger_bands(closes, self.bb_period)
        if bb is None:
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.0,
                reason="Unable to calculate Bollinger Bands",
                timestamp=datetime.utcnow().isoformat(),
            )
        
        upper_band = bb["upper_band"]
        lower_band = bb["lower_band"]
        middle_band = bb["middle_band"]
        
        band_width = upper_band - lower_band
        position_ratio = (current_price - lower_band) / band_width if band_width > 0 else 0.5
        
        # Scalping signals
        if current_price <= lower_band and tick_trend > 0:
            # Price at lower band and ticking up
            confidence = 0.7 + (position_ratio * 0.2)  # 0.7 to 0.9
            
            log_info(
                f"Scalping (BULLISH) on {self.symbol}",
                price=current_price,
                lower_band=lower_band,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=confidence,
                reason=f"Price at lower band ({lower_band:.5f}), ticking up",
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "upper_band": upper_band,
                    "middle_band": middle_band,
                    "lower_band": lower_band,
                    "current_price": current_price,
                    "tick_trend": tick_trend,
                },
            )
        
        elif current_price >= upper_band and tick_trend < 0:
            # Price at upper band and ticking down
            confidence = 0.7 + ((1 - position_ratio) * 0.2)  # 0.7 to 0.9
            
            log_info(
                f"Scalping (BEARISH) on {self.symbol}",
                price=current_price,
                upper_band=upper_band,
                confidence=confidence,
            )
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=confidence,
                reason=f"Price at upper band ({upper_band:.5f}), ticking down",
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "upper_band": upper_band,
                    "middle_band": middle_band,
                    "lower_band": lower_band,
                    "current_price": current_price,
                    "tick_trend": tick_trend,
                },
            )
        
        elif current_price < lower_band:
            # Below lower band, expect mean reversion
            confidence = 0.5
            reason = f"Price below lower band, mean reversion expected"
            
            return StrategySignal(
                signal=Signal.RISE,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "upper_band": upper_band,
                    "middle_band": middle_band,
                    "lower_band": lower_band,
                    "current_price": current_price,
                },
            )
        
        elif current_price > upper_band:
            # Above upper band, expect mean reversion
            confidence = 0.5
            reason = f"Price above upper band, mean reversion expected"
            
            return StrategySignal(
                signal=Signal.FALL,
                confidence=confidence,
                reason=reason,
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "upper_band": upper_band,
                    "middle_band": middle_band,
                    "lower_band": lower_band,
                    "current_price": current_price,
                },
            )
        
        else:
            # Within bands, no clear signal
            return StrategySignal(
                signal=Signal.HOLD,
                confidence=0.3,
                reason="Price within bands, no scalping signal",
                timestamp=datetime.utcnow().isoformat(),
                metadata={
                    "upper_band": upper_band,
                    "middle_band": middle_band,
                    "lower_band": lower_band,
                    "current_price": current_price,
                },
            )

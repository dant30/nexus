"""
Trading strategies module.
Exports all available strategies.
"""

from .base import BaseStrategy, Signal, StrategySignal
from .breakout import BreakoutStrategy
from .momentum import MomentumStrategy
from .scalping import ScalpingStrategy

__all__ = [
    "BaseStrategy",
    "Signal",
    "StrategySignal",
    "BreakoutStrategy",
    "MomentumStrategy",
    "ScalpingStrategy",
]

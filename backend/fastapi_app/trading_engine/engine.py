"""
Main trading engine orchestrator.
Coordinates strategies, consensus, and execution.
"""

from typing import List, Optional, Dict
from decimal import Decimal
from datetime import datetime

from fastapi_app.trading_engine.strategies import (
    BaseStrategy,
    StrategySignal,
)
from fastapi_app.trading_engine.signal_consensus import SignalConsensus, ConsensusSignal
from fastapi_app.trading_engine.risk_manager import RiskManager, RiskAssessment
from fastapi_app.trading_engine.commission import CommissionCalculator
from django_core.accounts.models import Account
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("engine")


class TradingEngine:
    """
    Main trading engine that orchestrates the entire trading process.
    
    Flow:
    1. Collect market data (candles, ticks)
    2. Run all strategies
    3. Aggregate signals via consensus
    4. Assess risk
    5. Execute trade if approved
    """
    
    def __init__(
        self,
        strategies: List[BaseStrategy],
        account: Account,
        risk_manager: Optional[RiskManager] = None,
        commission_calculator: Optional[CommissionCalculator] = None,
    ):
        """
        Initialize trading engine.
        
        Args:
        - strategies: List of trading strategies to run
        - account: Trading account
        - risk_manager: Risk management engine (optional, creates default if None)
        - commission_calculator: Commission calculator (optional)
        """
        self.strategies = strategies
        self.account = account
        self.risk_manager = risk_manager or RiskManager()
        self.commission_calculator = commission_calculator or CommissionCalculator()
        self.consensus = SignalConsensus()
    
    async def analyze(
        self,
        candles: List[Dict],
        ticks: List[Dict],
    ) -> Dict:
        """
        Analyze market data and generate trading signal.
        
        Args:
        - candles: List of OHLC candle dicts
        - ticks: List of recent tick prices
        
        Returns:
        - Dict with analysis results including consensus signal
        """
        try:
            # Run all strategies
            strategy_signals: List[StrategySignal] = []
            
            for strategy in self.strategies:
                try:
                    signal = await strategy.analyze(candles, ticks)
                    # Add strategy name to signal
                    signal.strategy = strategy.name
                    strategy_signals.append(signal)
                    
                    log_info(
                        f"Strategy {strategy.name} signal: {signal.signal.value}",
                        confidence=signal.confidence,
                        symbol=strategy.symbol,
                    )
                except Exception as e:
                    log_error(
                        f"Strategy {strategy.name} error",
                        exception=e,
                    )
            
            if not strategy_signals:
                return {
                    "success": False,
                    "error": "No strategy signals generated",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            
            # Get consensus signal
            consensus_signal = self.consensus.aggregate(strategy_signals)
            
            log_info(
                f"Consensus decision: {consensus_signal.decision.value}",
                confidence=consensus_signal.confidence,
                account_id=self.account.id,
            )
            
            return {
                "success": True,
                "consensus": {
                    "decision": consensus_signal.decision.value,
                    "confidence": consensus_signal.confidence,
                    "reason": consensus_signal.reason,
                    "buy_votes": consensus_signal.buy_votes,
                    "sell_votes": consensus_signal.sell_votes,
                    "hold_votes": consensus_signal.hold_votes,
                },
                "strategies": consensus_signal.strategy_signals,
                "timestamp": consensus_signal.timestamp,
            }
        
        except Exception as e:
            log_error("Trading engine analysis failed", exception=e)
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    async def execute_if_approved(
        self,
        consensus: ConsensusSignal,
        stake: Decimal,
        min_confidence: float = 0.70,
    ) -> Dict:
        """
        Execute trade if consensus decision meets criteria and risk is acceptable.
        
        Args:
        - consensus: ConsensusSignal with decision
        - stake: Proposed trade stake
        - min_confidence: Minimum confidence threshold (0.0-1.0)
        
        Returns:
        - Dict with execution result
        """
        try:
            # Check confidence threshold
            if consensus.confidence < min_confidence:
                return {
                    "success": False,
                    "reason": f"Confidence {consensus.confidence} below minimum {min_confidence}",
                    "executed": False,
                }
            
            # Assess risk
            risk_assessment = self.risk_manager.assess_trade(self.account, stake)
            
            if not risk_assessment.is_approved:
                return {
                    "success": False,
                    "reason": risk_assessment.reason,
                    "risk_level": risk_assessment.risk_level,
                    "executed": False,
                }
            
            # Get trade direction from consensus
            if "BUY" in consensus.decision.value:
                direction = "RISE"
            elif "SELL" in consensus.decision.value:
                direction = "FALL"
            else:
                return {
                    "success": False,
                    "reason": f"Neutral signal, no trade direction: {consensus.decision.value}",
                    "executed": False,
                }
            
            log_info(
                f"Trade approved and ready for execution",
                direction=direction,
                stake=float(stake),
                confidence=consensus.confidence,
                account_id=self.account.id,
            )
            
            return {
                "success": True,
                "executed": False,  # Actual execution happens in API route
                "direction": direction,
                "stake": float(stake),
                "confidence": consensus.confidence,
                "reason": f"Ready to execute {direction} trade with {consensus.confidence:.2%} confidence",
            }
        
        except Exception as e:
            log_error("Trade execution check failed", exception=e)
            return {
                "success": False,
                "error": str(e),
                "executed": False,
            }

"""
Professional trading engine orchestrator.
Coordinates strategies, consensus, and execution with comprehensive error handling.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime

# === FIX: ADD THIS IMPORT ===
from fastapi_app.trading_engine.strategies import BaseStrategy, StrategySignal, Signal
# ============================

from fastapi_app.trading_engine.signal_consensus import SignalConsensus, ConsensusSignal, ConsensusDecision
from fastapi_app.trading_engine.risk_manager import RiskManager, RiskAssessment
from django_core.accounts.models import Account
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("engine")


class TradingEngine:
    """
    Professional trading engine that orchestrates the entire trading process.
    
    Trading Flow:
    1. Collect market data (candles, ticks)
    2. Run all registered strategies in parallel
    3. Aggregate signals via weighted consensus
    4. Assess risk with comprehensive checks
    5. Execute trade only if ALL conditions met
    
    Safety Features:
    - Minimum confidence threshold: 0.70
    - Minimum agreeing strategies: 2
    - Comprehensive risk assessment
    - Graceful degradation on errors
    """
    
    # Minimum requirements for trade execution
    MIN_CONFIDENCE_THRESHOLD = 0.70
    MIN_AGREEING_STRATEGIES = 2
    ALLOWED_DECISIONS = {
        ConsensusDecision.STRONG_RISE,
        ConsensusDecision.RISE,
        ConsensusDecision.STRONG_FALL,
        ConsensusDecision.FALL,
    }
    
    def __init__(
        self,
        strategies: List[BaseStrategy],
        account: Account,
        risk_manager: Optional[RiskManager] = None,
        consensus_engine: Optional[SignalConsensus] = None,
        min_confidence: float = MIN_CONFIDENCE_THRESHOLD,
        min_agreeing: int = MIN_AGREEING_STRATEGIES,
    ):
        """
        Initialize professional trading engine.
        
        Args:
            strategies: List of trading strategies to run
            account: Trading account
            risk_manager: Risk management engine (creates default if None)
            consensus_engine: Signal consensus engine (creates default if None)
            min_confidence: Minimum confidence for trade execution
            min_agreeing: Minimum strategies that must agree
        """
        self.strategies = strategies
        self.account = account
        self.risk_manager = risk_manager or RiskManager()
        self.consensus = consensus_engine or SignalConsensus(
            min_agreeing=min_agreeing,
            min_confidence=min_confidence,
        )
        self.min_confidence = min_confidence
        self.min_agreeing = min_agreeing
        
        self.logger = get_logger(f"engine.{account.id}")
    
    async def analyze(
        self,
        candles: List[Dict[str, Any]],
        ticks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze market data and generate consensus signal.
        
        Args:
            candles: List of OHLC candle dicts
            ticks: List of recent tick prices
        
        Returns:
            Dict with analysis results including consensus signal
        """
        try:
            # Validate input data
            if not candles or len(candles) < 10:
                return {
                    "success": False,
                    "error": f"Insufficient candle data: {len(candles) if candles else 0}",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            
            if not self.strategies:
                return {
                    "success": False,
                    "error": "No strategies registered",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            
            # Run all strategies in parallel for performance
            strategy_signals: List[StrategySignal] = []
            
            for strategy in self.strategies:
                try:
                    signal = await strategy.analyze(candles, ticks)
                    strategy_signals.append(signal)
                    
                    # Log significant signals
                    if signal.signal != Signal.HOLD and signal.confidence >= 0.50:
                        log_info(
                            f"Strategy {strategy.name}: {signal.signal.value}",
                            confidence=signal.confidence,
                            symbol=strategy.symbol,
                            reason=signal.reason[:50],
                        )
                except Exception as e:
                    log_error(
                        f"Strategy {strategy.name} failed",
                        exception=e,
                        symbol=strategy.symbol,
                    )
                    # Continue with other strategies - don't fail the whole analysis
            
            if not strategy_signals:
                return {
                    "success": False,
                    "error": "No strategy signals generated",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            
            # Get consensus signal
            consensus_signal = self.consensus.aggregate(strategy_signals)
            
            return {
                "success": True,
                "consensus": {
                    "decision": consensus_signal.decision.value,
                    "confidence": consensus_signal.confidence,
                    "reason": consensus_signal.reason,
                    "rise_votes": consensus_signal.rise_votes,
                    "fall_votes": consensus_signal.fall_votes,
                    "hold_votes": consensus_signal.hold_votes,
                    "direction": consensus_signal.direction,
                    "agreeing_strategies": consensus_signal.agreeing_strategies,
                    "total_strategies": consensus_signal.total_strategies,
                    "contracts": {
                        "rise_fall": consensus_signal.rise_fall_contract,
                        "call_put": consensus_signal.call_put_contract,
                    },
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
    
    async def should_execute(
        self,
        consensus: ConsensusSignal,
        stake: Optional[Decimal] = None,
    ) -> Dict[str, Any]:
        """
        Determine if trade should be executed based on consensus and risk.
        
        Args:
            consensus: ConsensusSignal from aggregate()
            stake: Proposed stake (uses recommended if None)
        
        Returns:
            Dict with execution decision and metadata
        """
        try:
            # 1. CHECK CONSENSUS DECISION
            if consensus.decision not in self.ALLOWED_DECISIONS:
                return {
                    "success": False,
                    "executable": False,
                    "reason": f"Non-trading decision: {consensus.decision.value}",
                    "decision": consensus.decision.value,
                }
            
            # 2. CHECK CONFIDENCE THRESHOLD
            if consensus.confidence < self.min_confidence:
                return {
                    "success": False,
                    "executable": False,
                    "reason": f"Confidence {consensus.confidence:.2%} < minimum {self.min_confidence:.2%}",
                    "confidence": consensus.confidence,
                    "min_required": self.min_confidence,
                }
            
            # 3. CHECK MINIMUM AGREEING STRATEGIES
            if consensus.agreeing_strategies < self.min_agreeing:
                return {
                    "success": False,
                    "executable": False,
                    "reason": f"Agreeing strategies {consensus.agreeing_strategies} < minimum {self.min_agreeing}",
                    "agreeing": consensus.agreeing_strategies,
                    "min_required": self.min_agreeing,
                }
            
            # 4. DETERMINE STAKE
            if stake is None:
                stake = self.risk_manager._calculate_recommended_stake(self.account)
            
            # 5. ASSESS RISK
            risk_assessment = await self.risk_manager.assess_trade(self.account, stake)
            final_stake = risk_assessment.recovery_stake or stake
            
            if not risk_assessment.is_approved:
                return {
                    "success": False,
                    "executable": False,
                    "reason": risk_assessment.reason,
                    "risk_level": risk_assessment.risk_level,
                    "issues": risk_assessment.issues,
                }
            
            # 6. ALL CHECKS PASSED - READY TO EXECUTE
            direction = "RISE" if "RISE" in consensus.decision.value else "FALL"
            
            log_info(
                f"Trade executable: {direction}",
                confidence=consensus.confidence,
                requested_stake=float(stake),
                final_stake=float(final_stake),
                recovery_level=risk_assessment.recovery_level,
                decision=consensus.decision.value,
                account_id=self.account.id,
            )
            
            return {
                "success": True,
                "executable": True,
                "direction": direction,
                "stake": float(final_stake),
                "original_stake": float(stake) if final_stake != stake else None,
                "confidence": consensus.confidence,
                "decision": consensus.decision.value,
                "risk_assessment": {
                    "risk_level": risk_assessment.risk_level,
                    "recovery_level": risk_assessment.recovery_level,
                    "recovery_stake": float(risk_assessment.recovery_stake) if risk_assessment.recovery_stake else None,
                    "recommended_stake": float(risk_assessment.recommended_stake) if risk_assessment.recommended_stake else None,
                    "max_stake": float(risk_assessment.max_stake) if risk_assessment.max_stake else None,
                },
                "reason": f"Ready to execute {direction} with {consensus.confidence:.2%} confidence",
            }
        
        except Exception as e:
            log_error("Trade execution check failed", exception=e)
            return {
                "success": False,
                "executable": False,
                "error": str(e),
            }
    
    async def analyze_and_should_execute(
        self,
        candles: List[Dict[str, Any]],
        ticks: List[Dict[str, Any]],
        stake: Optional[Decimal] = None,
    ) -> Dict[str, Any]:
        """
        Complete pipeline: analyze market and determine if trade should execute.
        
        This is the main entry point for the trading engine.
        
        Returns:
            Dict with full analysis and execution decision
        """
        # Step 1: Analyze market
        analysis = await self.analyze(candles, ticks)
        
        if not analysis["success"]:
            return analysis
        
        # Step 2: Check if should execute
        consensus_data = analysis["consensus"]
        
        # Convert dict back to ConsensusSignal object
        consensus_signal = ConsensusSignal(
            decision=ConsensusDecision(consensus_data["decision"]),
            confidence=consensus_data["confidence"],
            rise_votes=consensus_data["rise_votes"],
            fall_votes=consensus_data["fall_votes"],
            hold_votes=consensus_data["hold_votes"],
            reason=consensus_data["reason"],
            timestamp=consensus_data["timestamp"],
            strategy_signals=analysis["strategies"],
            direction=consensus_data["direction"],
            rise_fall_contract=consensus_data["contracts"]["rise_fall"],
            call_put_contract=consensus_data["contracts"]["call_put"],
            agreeing_strategies=consensus_data["agreeing_strategies"],
            total_strategies=consensus_data["total_strategies"],
        )
        
        execution_decision = await self.should_execute(consensus_signal, stake)
        
        # Combine results
        return {
            **analysis,
            "execution": execution_decision,
        }

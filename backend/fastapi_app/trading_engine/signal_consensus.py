"""
Signal consensus engine with professional voting system.
Requires 2+ agreeing signals with 70%+ confidence for execution.
"""
from typing import List, Optional, Dict, Tuple
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, field

from fastapi_app.trading_engine.strategies import StrategySignal, Signal, resolve_signal_contracts
from shared.utils.logger import log_info, get_logger

logger = get_logger("consensus")


class ConsensusDecision(str, Enum):
    """Final trading decision with strength indication."""
    STRONG_RISE = "STRONG_RISE"  # 2+ high confidence rise
    RISE = "RISE"                 # 2+ rise signals
    WEAK_RISE = "WEAK_RISE"      # 1 rise signal, net positive
    NEUTRAL = "NEUTRAL"          # No clear direction
    WEAK_FALL = "WEAK_FALL"      # 1 fall signal, net negative
    FALL = "FALL"               # 2+ fall signals
    STRONG_FALL = "STRONG_FALL"  # 2+ high confidence fall


@dataclass
class ConsensusSignal:
    """Professional consensus signal with complete metadata."""
    decision: ConsensusDecision
    confidence: float  # 0.0 to 1.0
    rise_votes: float  # Weighted sum of rise confidences
    fall_votes: float  # Weighted sum of fall confidences
    hold_votes: int    # Count of hold signals
    reason: str
    timestamp: str
    strategy_signals: List[Dict]
    direction: Optional[str]
    rise_fall_contract: Optional[str]
    call_put_contract: Optional[str]
    agreeing_strategies: int = 0
    total_strategies: int = 0


class SignalConsensus:
    """
    Professional consensus engine for trading signals.
    
    RULES:
    1. Requires at least 2 strategies to agree on direction
    2. Minimum confidence threshold: 0.70 for trade execution
    3. Weighted voting based on strategy confidence
    4. Strong signals require 2+ strategies with confidence > 0.80
    
    VOTING SYSTEM:
        - RISE: +confidence points
        - FALL: -confidence points
        - HOLD: 0 points
    """
    
    # Configurable thresholds
    MIN_AGREEING_STRATEGIES = 2
    MIN_CONFIDENCE_THRESHOLD = 0.70
    STRONG_CONFIDENCE_THRESHOLD = 0.80
    NEUTRAL_THRESHOLD = 0.20  # Net vote below this = NEUTRAL
    
    def __init__(
        self,
        min_agreeing: int = MIN_AGREEING_STRATEGIES,
        min_confidence: float = MIN_CONFIDENCE_THRESHOLD,
    ):
        """
        Initialize consensus engine with configurable thresholds.
        
        Args:
            min_agreeing: Minimum strategies that must agree (default: 2)
            min_confidence: Minimum confidence for execution (default: 0.70)
        """
        self.min_agreeing = min_agreeing
        self.min_confidence = min_confidence
    
    def aggregate(self, signals: List[StrategySignal]) -> ConsensusSignal:
        """
        Aggregate multiple strategy signals into professional consensus.
        
        Args:
            signals: List of StrategySignal from different strategies
        
        Returns:
            ConsensusSignal with final decision and metadata
        """
        if not signals:
            return self._create_empty_consensus("No signals provided")
        
        # Initialize vote counters
        rise_votes = 0.0
        fall_votes = 0.0
        hold_votes = 0
        rise_count = 0
        fall_count = 0
        high_conf_rise = 0
        high_conf_fall = 0
        
        strategy_signals = []
        
        # Process each signal
        for signal in signals:
            contracts = resolve_signal_contracts(signal.signal)
            strategy_name = getattr(signal, "strategy", "Unknown")
            
            # Record signal for metadata
            strategy_signals.append({
                "strategy": strategy_name,
                "signal": signal.signal.value,
                "confidence": signal.confidence,
                "reason": signal.reason,
                "direction": contracts["direction"],
                "contracts": {
                    "rise_fall": contracts["rise_fall_contract"],
                    "call_put": contracts["call_put_contract"],
                },
            })
            
            # Count votes
            if signal.signal == Signal.RISE:
                rise_votes += signal.confidence
                rise_count += 1
                if signal.confidence >= self.STRONG_CONFIDENCE_THRESHOLD:
                    high_conf_rise += 1
            elif signal.signal == Signal.FALL:
                fall_votes += signal.confidence
                fall_count += 1
                if signal.confidence >= self.STRONG_CONFIDENCE_THRESHOLD:
                    high_conf_fall += 1
            elif signal.signal == Signal.HOLD:
                hold_votes += 1
        
        total_strategies = len(signals)
        
        # Normalize votes by total strategies for fair comparison
        avg_rise = rise_votes / total_strategies
        avg_fall = fall_votes / total_strategies
        net_vote = avg_rise - avg_fall
        
        # Determine consensus decision based on rules
        decision, confidence, reason = self._determine_consensus(
            rise_count=rise_count,
            fall_count=fall_count,
            high_conf_rise=high_conf_rise,
            high_conf_fall=high_conf_fall,
            avg_rise=avg_rise,
            avg_fall=avg_fall,
            net_vote=net_vote,
            total_strategies=total_strategies,
        )
        
        # Get contracts for the decision
        consensus_contracts = resolve_signal_contracts(decision.value)
        
        # Log consensus result
        log_info(
            f"Consensus signal: {decision.value}",
            confidence=round(confidence, 4),
            rise_votes=round(avg_rise, 4),
            fall_votes=round(avg_fall, 4),
            rise_count=rise_count,
            fall_count=fall_count,
            total_strategies=total_strategies,
            agreeing_strategies=max(rise_count, fall_count),
        )
        
        return ConsensusSignal(
            decision=decision,
            confidence=round(confidence, 4),
            rise_votes=round(avg_rise, 4),
            fall_votes=round(avg_fall, 4),
            hold_votes=hold_votes,
            reason=reason,
            timestamp=datetime.utcnow().isoformat(),
            strategy_signals=strategy_signals,
            direction=consensus_contracts["direction"],
            rise_fall_contract=consensus_contracts["rise_fall_contract"],
            call_put_contract=consensus_contracts["call_put_contract"],
            agreeing_strategies=max(rise_count, fall_count),
            total_strategies=total_strategies,
        )
    
    def _determine_consensus(
        self,
        rise_count: int,
        fall_count: int,
        high_conf_rise: int,
        high_conf_fall: int,
        avg_rise: float,
        avg_fall: float,
        net_vote: float,
        total_strategies: int,
    ) -> Tuple[ConsensusDecision, float, str]:
        """
        Determine consensus decision based on voting rules.
        
        Returns:
            Tuple of (decision, confidence, reason)
        """
        # CASE 1: Strong Rise - 2+ high confidence rise signals
        if rise_count >= self.min_agreeing and high_conf_rise >= 2:
            confidence = min(0.85 + (avg_rise * 0.1), 0.95)
            reason = f"Strong rise: {rise_count} signals ({high_conf_rise} high confidence)"
            return ConsensusDecision.STRONG_RISE, confidence, reason
        
        # CASE 2: Strong Fall - 2+ high confidence fall signals
        if fall_count >= self.min_agreeing and high_conf_fall >= 2:
            confidence = min(0.85 + (avg_fall * 0.1), 0.95)
            reason = f"Strong fall: {fall_count} signals ({high_conf_fall} high confidence)"
            return ConsensusDecision.STRONG_FALL, confidence, reason
        
        # CASE 3: Rise - 2+ rise signals
        if rise_count >= self.min_agreeing and rise_count > fall_count:
            # Confidence based on average rise confidence
            confidence = min(0.70 + (avg_rise * 0.2), 0.85)
            reason = f"Rise: {rise_count} signals, avg confidence {avg_rise:.2f}"
            return ConsensusDecision.RISE, confidence, reason
        
        # CASE 4: Fall - 2+ fall signals
        if fall_count >= self.min_agreeing and fall_count > rise_count:
            # Confidence based on average fall confidence
            confidence = min(0.70 + (avg_fall * 0.2), 0.85)
            reason = f"Fall: {fall_count} signals, avg confidence {avg_fall:.2f}"
            return ConsensusDecision.FALL, confidence, reason
        
        # CASE 5: Weak Rise - 1 rise signal, net positive
        if rise_count == 1 and net_vote > self.NEUTRAL_THRESHOLD:
            confidence = 0.50 + (avg_rise * 0.2)
            reason = f"Weak rise: 1 signal, confidence {avg_rise:.2f}"
            return ConsensusDecision.WEAK_RISE, confidence, reason
        
        # CASE 6: Weak Fall - 1 fall signal, net negative
        if fall_count == 1 and net_vote < -self.NEUTRAL_THRESHOLD:
            confidence = 0.50 + (avg_fall * 0.2)
            reason = f"Weak fall: 1 signal, confidence {avg_fall:.2f}"
            return ConsensusDecision.WEAK_FALL, confidence, reason
        
        # CASE 7: Neutral - No clear consensus
        return ConsensusDecision.NEUTRAL, 0.0, "No consensus: insufficient agreeing signals"
    
    def _create_empty_consensus(self, reason: str) -> ConsensusSignal:
        """Create neutral consensus when no signals available."""
        return ConsensusSignal(
            decision=ConsensusDecision.NEUTRAL,
            confidence=0.0,
            rise_votes=0.0,
            fall_votes=0.0,
            hold_votes=0,
            reason=reason,
            timestamp=datetime.utcnow().isoformat(),
            strategy_signals=[],
            direction=None,
            rise_fall_contract=None,
            call_put_contract=None,
            agreeing_strategies=0,
            total_strategies=0,
        )
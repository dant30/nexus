"""
Signal consensus engine.
Aggregates signals from multiple strategies and produces consensus signal.
"""

from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
from dataclasses import dataclass

from fastapi_app.trading_engine.strategies import StrategySignal, Signal, resolve_signal_contracts
from shared.utils.logger import log_info, get_logger

logger = get_logger("consensus")


class ConsensusDecision(str, Enum):
    """Final trading decision."""
    STRONG_RISE = "STRONG_RISE"
    RISE = "RISE"
    WEAK_RISE = "WEAK_RISE"
    NEUTRAL = "NEUTRAL"
    WEAK_FALL = "WEAK_FALL"
    FALL = "FALL"
    STRONG_FALL = "STRONG_FALL"


@dataclass
class ConsensusSignal:
    """Final consensus signal from multiple strategies."""
    decision: ConsensusDecision
    confidence: float  # 0.0 to 1.0
    rise_votes: float
    fall_votes: float
    hold_votes: int
    reason: str
    timestamp: str
    strategy_signals: List[Dict]
    direction: Optional[str]
    rise_fall_contract: Optional[str]
    call_put_contract: Optional[str]


class SignalConsensus:
    """
    Aggregate multiple strategy signals into a single consensus decision.
    
    Voting system:
    - RISE signal: +1 vote (weighted by confidence)
    - FALL signal: -1 vote (weighted by confidence)
    - HOLD signal: 0 votes
    
    Final decision:
    - 2+ strong rise (conf > 0.7): STRONG_RISE
    - 1+ rise (conf > 0.6): RISE
    - Net positive: WEAK_RISE
    - Net zero: NEUTRAL
    - Net negative: WEAK_FALL / FALL / STRONG_FALL
    """
    
    def __init__(self, min_agreement: float = 0.0):
        """
        Initialize consensus engine.
        
        Args:
        - min_agreement: Minimum threshold for decision (0.0-1.0)
                        Higher = stricter requirements
        """
        self.min_agreement = min_agreement
    
    def aggregate(self, signals: List[StrategySignal]) -> ConsensusSignal:
        """
        Aggregate multiple strategy signals into consensus decision.
        
        Args:
        - signals: List of StrategySignal from different strategies
        
        Returns:
        - ConsensusSignal with final decision
        """
        if not signals:
            return ConsensusSignal(
                decision=ConsensusDecision.NEUTRAL,
                confidence=0.0,
                rise_votes=0,
                fall_votes=0,
                hold_votes=0,
                reason="No signals provided",
                timestamp=datetime.utcnow().isoformat(),
                strategy_signals=[],
                direction=None,
                rise_fall_contract=None,
                call_put_contract=None,
            )
        
        # Count votes
        rise_votes = 0.0
        fall_votes = 0.0
        hold_votes = 0.0
        strong_buy_count = 0
        strong_sell_count = 0

        strategy_signals = []

        for signal in signals:
            contracts = resolve_signal_contracts(signal.signal)
            strategy_signals.append({
                "strategy": getattr(signal, "strategy", "Unknown"),
                "signal": signal.signal.value,
                "confidence": signal.confidence,
                "reason": signal.reason,
                "direction": contracts["direction"],
                "contracts": {
                    "rise_fall": contracts["rise_fall_contract"],
                    "call_put": contracts["call_put_contract"],
                },
            })

            if signal.signal == Signal.RISE:
                rise_votes += float(signal.confidence)
                if signal.confidence > 0.7:
                    strong_buy_count += 1
            elif signal.signal == Signal.FALL:
                fall_votes += float(signal.confidence)
                if signal.confidence > 0.7:
                    strong_sell_count += 1
            elif signal.signal == Signal.HOLD:
                hold_votes += 1

        # --- NORMALIZE: use averaged confidences per-strategy to keep votes in [0..1] ---
        num_strategies = max(1, len(signals))
        avg_rise = rise_votes / num_strategies
        avg_fall = fall_votes / num_strategies

        # Calculate net vote using averaged confidences
        net_vote = avg_rise - avg_fall
        total_votes = avg_rise + avg_fall

        # Determine consensus decision using averaged values
        if total_votes == 0:
            decision = ConsensusDecision.NEUTRAL
            confidence = 0.0
            reason = "No clear signals from strategies"
        elif strong_buy_count >= 2 and net_vote > 0:
            decision = ConsensusDecision.STRONG_RISE
            confidence = min((net_vote / max(total_votes, 1e-6)) * 0.95, 0.95)
            reason = f"Strong rise consensus ({strong_buy_count} strong signals)"
        elif strong_sell_count >= 2 and net_vote < 0:
            decision = ConsensusDecision.STRONG_FALL
            confidence = min((abs(net_vote) / max(total_votes, 1e-6)) * 0.95, 0.95)
            reason = f"Strong fall consensus ({strong_sell_count} strong signals)"
        elif net_vote > total_votes * 0.5:
            decision = ConsensusDecision.RISE
            confidence = min(net_vote / max(total_votes, 1e-6), 0.9)
            reason = f"Rise consensus ({len([s for s in signals if s.signal == Signal.RISE])} rise signals)"
        elif net_vote < -total_votes * 0.5:
            decision = ConsensusDecision.FALL
            confidence = min(abs(net_vote) / max(total_votes, 1e-6), 0.9)
            reason = f"Fall consensus ({len([s for s in signals if s.signal == Signal.FALL])} fall signals)"
        elif net_vote > 0:
            decision = ConsensusDecision.WEAK_RISE
            confidence = (net_vote / max(total_votes, 1e-6)) * 0.5
            reason = "Weak rise signal"
        elif net_vote < 0:
            decision = ConsensusDecision.WEAK_FALL
            confidence = (abs(net_vote) / max(total_votes, 1e-6)) * 0.5
            reason = "Weak fall signal"
        else:
            decision = ConsensusDecision.NEUTRAL
            confidence = 0.0
            reason = "Mixed signals, no consensus"

        log_info(
            f"Consensus signal: {decision.value}",
            confidence=confidence,
            rise_votes=avg_rise,
            fall_votes=avg_fall,
            total_strategies=len(signals),
        )

        consensus_contracts = resolve_signal_contracts(decision.value)

        return ConsensusSignal(
            decision=decision,
            confidence=float(round(confidence, 4)),
            rise_votes=float(round(avg_rise, 4)),
            fall_votes=float(round(avg_fall, 4)),
            hold_votes=int(hold_votes),
            reason=reason,
            timestamp=datetime.utcnow().isoformat(),
            strategy_signals=strategy_signals,
            direction=consensus_contracts["direction"],
            rise_fall_contract=consensus_contracts["rise_fall_contract"],
            call_put_contract=consensus_contracts["call_put_contract"],
        )

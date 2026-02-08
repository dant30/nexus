"""
Signal consensus engine.
Aggregates signals from multiple strategies and produces consensus signal.
"""

from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
from dataclasses import dataclass

from fastapi_app.trading_engine.strategies import StrategySignal, Signal
from shared.utils.logger import log_info, get_logger

logger = get_logger("consensus")


class ConsensusDecision(str, Enum):
    """Final trading decision."""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    WEAK_BUY = "WEAK_BUY"
    NEUTRAL = "NEUTRAL"
    WEAK_SELL = "WEAK_SELL"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


@dataclass
class ConsensusSignal:
    """Final consensus signal from multiple strategies."""
    decision: ConsensusDecision
    confidence: float  # 0.0 to 1.0
    buy_votes: int
    sell_votes: int
    hold_votes: int
    reason: str
    timestamp: str
    strategy_signals: List[Dict]


class SignalConsensus:
    """
    Aggregate multiple strategy signals into a single consensus decision.
    
    Voting system:
    - BUY signal: +1 vote (weighted by confidence)
    - SELL signal: -1 vote (weighted by confidence)
    - HOLD signal: 0 votes
    
    Final decision:
    - 2+ strong buy (conf > 0.7): STRONG_BUY
    - 1+ buy (conf > 0.6): BUY
    - Net positive: WEAK_BUY
    - Net zero: NEUTRAL
    - Net negative: WEAK_SELL / SELL / STRONG_SELL
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
                buy_votes=0,
                sell_votes=0,
                hold_votes=0,
                reason="No signals provided",
                timestamp=datetime.utcnow().isoformat(),
                strategy_signals=[],
            )
        
        # Count votes
        buy_votes = 0.0
        sell_votes = 0.0
        hold_votes = 0.0
        strong_buy_count = 0
        strong_sell_count = 0
        
        strategy_signals = []
        
        for signal in signals:
            strategy_signals.append({
                "strategy": getattr(signal, "strategy", "Unknown"),
                "signal": signal.signal.value,
                "confidence": signal.confidence,
                "reason": signal.reason,
            })
            
            if signal.signal == Signal.BUY:
                buy_votes += signal.confidence
                if signal.confidence > 0.7:
                    strong_buy_count += 1
            elif signal.signal == Signal.SELL:
                sell_votes += signal.confidence
                if signal.confidence > 0.7:
                    strong_sell_count += 1
            elif signal.signal == Signal.HOLD:
                hold_votes += 1
        
        # Calculate net vote
        net_vote = buy_votes - sell_votes
        total_votes = buy_votes + sell_votes
        
        # Determine consensus decision
        if total_votes == 0:
            decision = ConsensusDecision.NEUTRAL
            confidence = 0.0
            reason = "No clear signals from strategies"
        
        elif strong_buy_count >= 2 and net_vote > 0:
            decision = ConsensusDecision.STRONG_BUY
            confidence = min((net_vote / max(total_votes, 1)) * 0.95, 0.95)
            reason = f"Strong buy consensus ({strong_buy_count} strong signals)"
        
        elif strong_sell_count >= 2 and net_vote < 0:
            decision = ConsensusDecision.STRONG_SELL
            confidence = min((abs(net_vote) / max(total_votes, 1)) * 0.95, 0.95)
            reason = f"Strong sell consensus ({strong_sell_count} strong signals)"
        
        elif net_vote > total_votes * 0.5:
            decision = ConsensusDecision.BUY
            confidence = min(net_vote / max(total_votes, 1), 0.9)
            reason = f"Buy consensus ({len([s for s in signals if s.signal == Signal.BUY])} buy signals)"
        
        elif net_vote < -total_votes * 0.5:
            decision = ConsensusDecision.SELL
            confidence = min(abs(net_vote) / max(total_votes, 1), 0.9)
            reason = f"Sell consensus ({len([s for s in signals if s.signal == Signal.SELL])} sell signals)"
        
        elif net_vote > 0:
            decision = ConsensusDecision.WEAK_BUY
            confidence = net_vote / max(total_votes, 1) * 0.5
            reason = "Weak buy signal"
        
        elif net_vote < 0:
            decision = ConsensusDecision.WEAK_SELL
            confidence = abs(net_vote) / max(total_votes, 1) * 0.5
            reason = "Weak sell signal"
        
        else:
            decision = ConsensusDecision.NEUTRAL
            confidence = 0.0
            reason = "Mixed signals, no consensus"
        
        log_info(
            f"Consensus signal: {decision.value}",
            confidence=confidence,
            buy_votes=buy_votes,
            sell_votes=sell_votes,
            total_strategies=len(signals),
        )
        
        return ConsensusSignal(
            decision=decision,
            confidence=confidence,
            buy_votes=int(buy_votes),
            sell_votes=int(sell_votes),
            hold_votes=int(hold_votes),
            reason=reason,
            timestamp=datetime.utcnow().isoformat(),
            strategy_signals=strategy_signals,
        )

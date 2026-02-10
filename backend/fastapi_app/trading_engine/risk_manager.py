"""
Risk management engine.
Enforces trading limits and risk rules.
"""
from decimal import Decimal
from typing import Optional, List, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta

from django_core.accounts.models import Account
from django_core.trades.models import Trade
from asgiref.sync import sync_to_async
from shared.utils.logger import log_error, log_info, get_logger

logger = get_logger("risk")


@dataclass
class RiskAssessment:
    """Risk assessment result."""
    is_approved: bool
    reason: str
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    issues: List[str]


class RiskManager:
    """
    Manage trading risk and enforce limits.
    
    Enforces:
    - Account balance limits
    - Daily loss limits
    - Consecutive loss limits
    - Stake size limits
    - Leverage limits
    """
    
    # Default limits
    MIN_STAKE = Decimal("0.35")
    MAX_STAKE = Decimal("1000.00")
    MAX_DAILY_LOSS_PERCENT = Decimal("10")  # 10% of balance
    MAX_CONSECUTIVE_LOSSES = 5
    MAX_TRADES_PER_HOUR = 60
    
    def __init__(
        self,
        min_stake: Optional[Decimal] = None,
        max_stake: Optional[Decimal] = None,
        max_daily_loss_percent: Optional[Decimal] = None,
    ):
        """
        Initialize risk manager.
        
        Args:
        - min_stake: Minimum trade stake
        - max_stake: Maximum trade stake
        - max_daily_loss_percent: Maximum daily loss as % of balance
        """
        self.min_stake = min_stake or self.MIN_STAKE
        self.max_stake = max_stake or self.MAX_STAKE
        self.max_daily_loss_percent = max_daily_loss_percent or self.MAX_DAILY_LOSS_PERCENT
    
    async def assess_trade(
        self,
        account: Account,
        stake: Decimal,
    ) -> RiskAssessment:
        """
        Assess risk of proposed trade.
        
        Args:
        - account: Trading account
        - stake: Proposed stake amount
        
        Returns:
        - RiskAssessment with approval decision
        """
        issues = []
        risk_level = "LOW"
        
        # Check account balance
        if account.balance <= 0:
            issues.append("Account balance is zero or negative")
            risk_level = "CRITICAL"
        
        # Check stake limits
        if stake < self.min_stake:
            issues.append(f"Stake {float(stake)} below minimum {float(self.min_stake)}")
            risk_level = "HIGH"
        
        if stake > self.max_stake:
            issues.append(f"Stake {float(stake)} exceeds maximum {float(self.max_stake)}")
            risk_level = "HIGH"
        
        if stake > account.balance:
            issues.append(f"Stake exceeds account balance ({float(account.balance)})")
            risk_level = "CRITICAL"
        
        # Check daily loss limit
        daily_loss = await self._calculate_daily_loss(account)
        max_allowed_loss = account.balance * (self.max_daily_loss_percent / Decimal("100"))
        
        if daily_loss >= max_allowed_loss:
            issues.append(
                f"Daily loss limit reached ({float(daily_loss)} / {float(max_allowed_loss)})"
            )
            risk_level = "CRITICAL"
        
        # Check consecutive losses
        consecutive_losses = await self._count_consecutive_losses(account)
        if consecutive_losses >= self.MAX_CONSECUTIVE_LOSSES:
            issues.append(f"Max consecutive losses reached ({consecutive_losses})")
            risk_level = "HIGH"
        
        # Check hourly trade limit
        trades_this_hour = await self._count_trades_this_hour(account)
        if trades_this_hour >= self.MAX_TRADES_PER_HOUR:
            issues.append(f"Hourly trade limit reached ({trades_this_hour})")
            risk_level = "MEDIUM"
        
        # Determine final decision
        is_approved = not issues or (risk_level == "LOW" or risk_level == "MEDIUM")
        
        reason = "Trade approved" if is_approved else f"Trade rejected: {issues[0]}"
        
        log_info(
            f"Trade assessment: {risk_level}",
            account_id=account.id,
            stake=float(stake),
            approved=is_approved,
            issues=issues,
        )
        
        return RiskAssessment(
            is_approved=is_approved,
            reason=reason,
            risk_level=risk_level,
            issues=issues,
        )
    
    async def _calculate_daily_loss(self, account: Account) -> Decimal:
        """Calculate total loss for today."""
        today = datetime.utcnow().date()
        today_trades = await sync_to_async(list)(
            Trade.objects.filter(
                account=account,
                created_at__date=today,
            )
        )
        
        total_loss = Decimal("0")
        for trade in today_trades:
            if trade.status == Trade.STATUS_CLOSED and trade.profit:
                if trade.profit < 0:
                    total_loss += abs(trade.profit)
        
        return total_loss
    
    async def _count_consecutive_losses(self, account: Account) -> int:
        """Count consecutive losing trades."""
        recent_trades = await sync_to_async(list)(
            Trade.objects.filter(
                account=account,
                status=Trade.STATUS_CLOSED,
            ).order_by("-created_at")[:10]
        )
        
        consecutive = 0
        for trade in recent_trades:
            if trade.profit and trade.profit < 0:
                consecutive += 1
            else:
                break
        
        return consecutive
    
    async def _count_trades_this_hour(self, account: Account) -> int:
        """Count trades in the past hour."""
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        return await sync_to_async(
            Trade.objects.filter(
                account=account,
                created_at__gte=one_hour_ago,
            ).count
        )()

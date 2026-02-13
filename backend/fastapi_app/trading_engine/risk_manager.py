"""
Professional risk management engine with comprehensive safeguards.
"""
from decimal import Decimal
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass, field
from datetime import timedelta

from django_core.accounts.models import Account
from django_core.trades.models import Trade
from asgiref.sync import sync_to_async
from django.utils import timezone
from shared.utils.logger import log_error, log_info, get_logger

logger = get_logger("risk")


@dataclass
class RiskAssessment:
    """Professional risk assessment result."""
    is_approved: bool
    reason: str
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    issues: List[str] = field(default_factory=list)
    max_stake: Optional[Decimal] = None
    recommended_stake: Optional[Decimal] = None
    recovery_stake: Optional[Decimal] = None
    recovery_level: int = 0


class RiskManager:
    """
    Professional risk management system.
    
    Enforces:
    - Minimum/Maximum stake limits
    - Account balance sufficiency
    - Daily loss limits (10% of balance)
    - Consecutive loss limits (5 max)
    - Hourly trade frequency (60 max)
    - Position sizing based on account balance
    """
    
    # Default limits (conservative for demo trading)
    MIN_STAKE = Decimal("0.35")
    MAX_STAKE = Decimal("50.00")  # Reduced for safety
    MAX_STAKE_PERCENT_OF_BALANCE = Decimal("5")  # 5% max per trade
    MAX_DAILY_LOSS_PERCENT = Decimal("10")  # 10% daily loss limit
    MAX_CONSECUTIVE_LOSSES = 5
    MAX_TRADES_PER_HOUR = 60
    FIBONACCI_SEQUENCE = [
        Decimal("1.0"),
        Decimal("1.5"),
        Decimal("2.25"),
        Decimal("3.375"),
        Decimal("5.0"),
        Decimal("7.5"),
        Decimal("10.0"),
    ]
    
    def __init__(
        self,
        min_stake: Optional[Decimal] = None,
        max_stake: Optional[Decimal] = None,
        max_daily_loss_percent: Optional[Decimal] = None,
        max_consecutive_losses: Optional[int] = None,
        fibonacci_sequence: Optional[List[Decimal]] = None,
    ):
        """Initialize risk manager with configurable limits."""
        self.min_stake = min_stake or self.MIN_STAKE
        self.max_stake = max_stake or self.MAX_STAKE
        self.max_daily_loss_percent = max_daily_loss_percent or self.MAX_DAILY_LOSS_PERCENT
        self.max_consecutive_losses = max_consecutive_losses or self.MAX_CONSECUTIVE_LOSSES
        self.fibonacci_sequence = fibonacci_sequence or self.FIBONACCI_SEQUENCE
    
    async def assess_trade(
        self,
        account: Account,
        stake: Decimal,
    ) -> RiskAssessment:
        """
        Comprehensive trade risk assessment.
        
        Returns:
            RiskAssessment with approval decision and recommendations
        """
        issues = []
        risk_level = "LOW"
        consecutive_losses = await self._count_consecutive_losses(account)
        recovery_level = min(consecutive_losses, len(self.fibonacci_sequence) - 1)
        recovery_stake = None
        check_stake = stake

        if consecutive_losses > 0:
            multiplier = self.fibonacci_sequence[recovery_level]
            recovery_stake = (stake * multiplier).quantize(Decimal("0.01"))
            check_stake = recovery_stake
            log_info(
                "Recovery mode active",
                account_id=account.id,
                consecutive_losses=consecutive_losses,
                recovery_level=recovery_level,
                multiplier=float(multiplier),
                requested_stake=float(stake),
                recovery_stake=float(recovery_stake),
            )
        
        # 1. ACCOUNT BALANCE CHECK
        if account.balance <= 0:
            issues.append(f"Zero/negative balance: {float(account.balance)}")
            risk_level = "CRITICAL"
        
        # 2. STAKE LIMIT CHECKS
        if check_stake < self.min_stake:
            issues.append(f"Stake {float(check_stake)} < minimum {float(self.min_stake)}")
            risk_level = "HIGH"
        
        if check_stake > self.max_stake:
            issues.append(f"Stake {float(check_stake)} > maximum {float(self.max_stake)}")
            risk_level = "HIGH"
        
        # 3. POSITION SIZING CHECK
        max_position = account.balance * (self.MAX_STAKE_PERCENT_OF_BALANCE / Decimal("100"))
        if check_stake > max_position:
            issues.append(f"Stake {float(check_stake)} > {self.MAX_STAKE_PERCENT_OF_BALANCE}% of balance ({float(max_position)})")
            risk_level = "HIGH"
        
        # 4. SUFFICIENT BALANCE CHECK
        if check_stake > account.balance:
            issues.append(f"Stake exceeds balance ({float(account.balance)})")
            risk_level = "CRITICAL"
        
        # 5. DAILY LOSS LIMIT CHECK
        daily_loss = await self._calculate_daily_loss(account)
        max_allowed_loss = account.balance * (self.max_daily_loss_percent / Decimal("100"))
        
        if daily_loss >= max_allowed_loss:
            issues.append(f"Daily loss limit reached: {float(daily_loss)}/{float(max_allowed_loss)}")
            risk_level = "CRITICAL"
        elif daily_loss > max_allowed_loss * Decimal("0.8"):
            issues.append(f"Approaching daily loss limit: {float(daily_loss)}/{float(max_allowed_loss)}")
            risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level
        
        # 6. CONSECUTIVE LOSS CHECK
        if consecutive_losses >= self.max_consecutive_losses:
            issues.append(f"Max consecutive losses reached: {consecutive_losses}")
            risk_level = "HIGH"
        elif consecutive_losses >= self.max_consecutive_losses - 2:
            issues.append(f"Near max consecutive losses: {consecutive_losses}/{self.max_consecutive_losses}")
            risk_level = "MEDIUM" if risk_level not in ["HIGH", "CRITICAL"] else risk_level
        
        # 7. HOURLY TRADE LIMIT CHECK
        trades_this_hour = await self._count_trades_this_hour(account)
        if trades_this_hour >= self.MAX_TRADES_PER_HOUR:
            issues.append(f"Hourly trade limit reached: {trades_this_hour}")
            risk_level = "MEDIUM"
        
        # 8. RECOMMENDED STAKE CALCULATION
        recommended_stake = self._calculate_recommended_stake(account)
        
        # FINAL DECISION
        # Only approve if no critical issues and not too many high issues
        critical_issues = [i for i in issues if "CRITICAL" in risk_level or "exceeds balance" in i or "limit reached" in i]
        high_issues = [i for i in issues if "HIGH" in risk_level or "below minimum" in i or "exceeds maximum" in i]
        
        is_approved = len(critical_issues) == 0 and len(high_issues) <= 1
        
        reason = "Trade approved" if is_approved else f"Rejected: {issues[0] if issues else 'Risk check failed'}"
        
        # Calculate safe max stake for this trade
        max_stake = min(
            self.max_stake,
            account.balance * Decimal("0.1"),  # 10% of balance max
            max_position,
        )
        
        log_info(
            f"Trade risk assessment: {risk_level}",
            account_id=account.id,
            requested_stake=float(stake),
            final_stake=float(check_stake),
            approved=is_approved,
            risk_level=risk_level,
            recovery_level=recovery_level,
            consecutive_losses=consecutive_losses,
            issue_count=len(issues),
        )
        
        return RiskAssessment(
            is_approved=is_approved,
            reason=reason,
            risk_level=risk_level,
            issues=issues,
            max_stake=max_stake,
            recommended_stake=recommended_stake,
            recovery_stake=recovery_stake,
            recovery_level=recovery_level,
        )
    
    def _calculate_recommended_stake(self, account: Account) -> Decimal:
        """Calculate recommended stake based on account balance."""
        # Conservative: 1% of balance
        recommended = account.balance * Decimal("0.01")
        
        # Clamp to min/max
        recommended = max(recommended, self.min_stake)
        recommended = min(recommended, self.max_stake)
        recommended = min(recommended, account.balance * Decimal("0.05"))  # Max 5%
        
        return recommended.quantize(Decimal("0.01"))
    
    @sync_to_async
    def _calculate_daily_loss(self, account: Account) -> Decimal:
        """Calculate total realized loss for today."""
        today = timezone.now().date()
        trades = Trade.objects.filter(
            account=account,
            created_at__date=today,
            status=Trade.STATUS_LOST,
        )
        
        total_loss = Decimal("0")
        for trade in trades:
            if trade.profit and trade.profit < 0:
                total_loss += abs(trade.profit)
        
        return total_loss
    
    @sync_to_async
    def _count_consecutive_losses(self, account: Account) -> int:
        """Count current consecutive losing trades."""
        recent_trades = Trade.objects.filter(
            account=account,
            status__in=[Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_FAILED],
        ).order_by("-created_at")[:10]
        
        consecutive = 0
        for trade in recent_trades:
            if trade.status in {Trade.STATUS_LOST, Trade.STATUS_FAILED}:
                consecutive += 1
            else:
                break
        
        return consecutive
    
    @sync_to_async
    def _count_trades_this_hour(self, account: Account) -> int:
        """Count trades in the past hour."""
        one_hour_ago = timezone.now() - timedelta(hours=1)
        return Trade.objects.filter(
            account=account,
            created_at__gte=one_hour_ago,
        ).count()

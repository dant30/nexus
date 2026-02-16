"""
Professional risk management engine with comprehensive safeguards.
"""
from decimal import Decimal
from typing import Optional, List, Dict
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
    consecutive_losses: int = 0
    consecutive_wins: int = 0
    daily_loss: Decimal = Decimal("0")
    daily_profit: Decimal = Decimal("0")
    daily_loss_limit: Decimal = Decimal("0")
    daily_profit_target: Decimal = Decimal("0")
    session_profit: Decimal = Decimal("0")
    daily_loss_hit: bool = False
    daily_profit_hit: bool = False
    session_take_profit_hit: bool = False
    recovery_active: bool = False
    loss_to_recover: Decimal = Decimal("0")
    recovered_amount: Decimal = Decimal("0")


@dataclass
class RecoveryState:
    """Stateful per-account recovery that persists across non-loss outcomes in-process."""
    active: bool = False
    initial_stake: Decimal = Decimal("0")
    current_level: int = 0
    loss_to_recover: Decimal = Decimal("0")
    recovered_amount: Decimal = Decimal("0")


class RiskManager:
    """
    Professional risk management system.
    
    Enforces:
    - Minimum/Maximum stake limits
    - Account balance sufficiency
    - Daily loss limits (10% of balance)
    - Consecutive loss limits (7 max)
    - Hourly trade frequency (120 max)
    - Position sizing based on account balance
    """
    
    # Default limits (conservative for demo trading)
    MIN_STAKE = Decimal("0.35")
    MAX_STAKE = Decimal("50.00")  # Reduced for safety
    MAX_STAKE_PERCENT_OF_BALANCE = Decimal("5")  # 5% max per trade
    MAX_DAILY_LOSS_PERCENT = Decimal("10")  # 10% daily loss limit
    MAX_DAILY_PROFIT_PERCENT = Decimal("15")  # 15% daily target (can be disabled via override=0)
    MAX_CONSECUTIVE_LOSSES = 7
    MAX_TRADES_PER_HOUR = 120
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
        max_daily_profit_percent: Optional[Decimal] = None,
        max_consecutive_losses: Optional[int] = None,
        fibonacci_sequence: Optional[List[Decimal]] = None,
    ):
        """Initialize risk manager with configurable limits."""
        self.min_stake = min_stake or self.MIN_STAKE
        self.max_stake = max_stake or self.MAX_STAKE
        self.max_daily_loss_percent = max_daily_loss_percent or self.MAX_DAILY_LOSS_PERCENT
        self.max_daily_profit_percent = (
            max_daily_profit_percent if max_daily_profit_percent is not None else self.MAX_DAILY_PROFIT_PERCENT
        )
        self.max_consecutive_losses = max_consecutive_losses or self.MAX_CONSECUTIVE_LOSSES
        self.fibonacci_sequence = fibonacci_sequence or self.FIBONACCI_SEQUENCE
        self._outcome_cache: Dict[int, Dict[str, Decimal | int]] = {}
        self._recovery_state: Dict[int, RecoveryState] = {}

    def _get_recovery_state(self, account_id: int) -> RecoveryState:
        """Get/create recovery state for account."""
        if account_id not in self._recovery_state:
            self._recovery_state[account_id] = RecoveryState()
        return self._recovery_state[account_id]
    
    async def assess_trade(
        self,
        account: Account,
        stake: Decimal,
        daily_loss_limit: Optional[Decimal] = None,
        daily_profit_target: Optional[Decimal] = None,
        session_take_profit: Optional[Decimal] = None,
        session_profit: Optional[Decimal] = None,
    ) -> RiskAssessment:
        """
        Comprehensive trade risk assessment.
        
        Returns:
            RiskAssessment with approval decision and recommendations
        """
        issues = []
        risk_level = "LOW"
        consecutive_losses = await self._count_consecutive_losses(account)
        consecutive_wins = await self._count_consecutive_wins(account)
        recovery = self._get_recovery_state(account.id)
        recovery_level = 0
        recovery_stake = None
        check_stake = stake

        # If recovery state was lost (e.g. restart) but we still have an active loss streak,
        # bootstrap from recent consecutive losses.
        if not recovery.active and consecutive_losses > 0:
            losses = await self._get_recent_streak_losses(account, consecutive_losses)
            if losses:
                recovery.active = True
                recovery.initial_stake = stake
                recovery.current_level = min(consecutive_losses, len(self.fibonacci_sequence) - 1)
                recovery.loss_to_recover = sum(losses, Decimal("0"))
                recovery.recovered_amount = Decimal("0")
                log_info(
                    "Recovery mode bootstrapped from streak",
                    account_id=account.id,
                    consecutive_losses=consecutive_losses,
                    recovery_level=recovery.current_level,
                    loss_to_recover=float(recovery.loss_to_recover),
                    loss_count=len(losses),
                )

        if recovery.active:
            recovery_level = recovery.current_level
            multiplier = self.fibonacci_sequence[recovery_level]
            base_stake = recovery.initial_stake if recovery.initial_stake > 0 else stake
            recovery_stake = (base_stake * multiplier).quantize(Decimal("0.01"))
            check_stake = recovery_stake
            log_info(
                "Recovery mode active",
                account_id=account.id,
                recovery_level=recovery_level,
                multiplier=float(multiplier),
                requested_stake=float(stake),
                recovery_stake=float(recovery_stake),
                loss_to_recover=float(recovery.loss_to_recover),
                recovered_amount=float(recovery.recovered_amount),
                remaining_to_recover=float(max(Decimal("0"), recovery.loss_to_recover - recovery.recovered_amount)),
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
        
        # 5. DAILY LOSS/PROFIT LIMIT CHECKS
        daily_net_profit = await self._calculate_daily_net_profit(account)
        # Recovery semantics: losses are offset by wins. If net PnL recovers >= 0, daily loss becomes 0.
        daily_loss = abs(daily_net_profit) if daily_net_profit < 0 else Decimal("0")
        daily_profit = daily_net_profit if daily_net_profit > 0 else Decimal("0")

        max_allowed_loss = (
            Decimal(str(daily_loss_limit)).quantize(Decimal("0.01"))
            if daily_loss_limit is not None
            else (account.balance * (self.max_daily_loss_percent / Decimal("100"))).quantize(Decimal("0.01"))
        )
        max_allowed_profit = (
            Decimal(str(daily_profit_target)).quantize(Decimal("0.01"))
            if daily_profit_target is not None
            else (account.balance * (self.max_daily_profit_percent / Decimal("100"))).quantize(Decimal("0.01"))
        )
        current_session_profit = (
            Decimal(str(session_profit)).quantize(Decimal("0.01"))
            if session_profit is not None
            else Decimal("0")
        )
        session_take_profit_target = (
            Decimal(str(session_take_profit)).quantize(Decimal("0.01"))
            if session_take_profit is not None and Decimal(str(session_take_profit)) > 0
            else None
        )
        daily_loss_hit = daily_loss >= max_allowed_loss if max_allowed_loss > 0 else False
        daily_profit_hit = daily_profit >= max_allowed_profit if max_allowed_profit > 0 else False
        session_take_profit_hit = (
            current_session_profit >= session_take_profit_target
            if session_take_profit_target is not None
            else False
        )

        if daily_loss_hit:
            issues.append(f"Daily loss limit reached: {float(daily_loss)}/{float(max_allowed_loss)}")
            risk_level = "CRITICAL"
        elif max_allowed_loss > 0 and daily_loss > max_allowed_loss * Decimal("0.8"):
            issues.append(f"Approaching daily loss limit: {float(daily_loss)}/{float(max_allowed_loss)}")
            risk_level = "HIGH" if risk_level != "CRITICAL" else risk_level

        if daily_profit_hit:
            issues.append(f"Daily profit target reached: {float(daily_profit)}/{float(max_allowed_profit)}")
            risk_level = "MEDIUM" if risk_level not in ["HIGH", "CRITICAL"] else risk_level

        if session_take_profit_hit:
            issues.append(
                f"Session take-profit reached: {float(current_session_profit)}/{float(session_take_profit_target)}"
            )
            risk_level = "MEDIUM" if risk_level not in ["HIGH", "CRITICAL"] else risk_level
        
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
            recovery_active=recovery.active,
            loss_to_recover=float(recovery.loss_to_recover) if recovery.active else 0,
            recovered_amount=float(recovery.recovered_amount) if recovery.active else 0,
            consecutive_losses=consecutive_losses,
            consecutive_wins=consecutive_wins,
            daily_loss=float(daily_loss),
            daily_profit=float(daily_profit),
            daily_loss_limit=float(max_allowed_loss),
            daily_profit_target=float(max_allowed_profit),
            session_profit=float(current_session_profit),
            daily_loss_hit=daily_loss_hit,
            daily_profit_hit=daily_profit_hit,
            session_take_profit_hit=session_take_profit_hit,
            issue_count=len(issues),
        )

        if check_stake != stake:
            log_info(
                "Recovery applied",
                account_id=account.id,
                requested_stake=float(stake),
                final_stake=float(check_stake),
                recovery_level=recovery_level,
                consecutive_losses=consecutive_losses if consecutive_losses > 0 else 0,
                loss_to_recover=float(recovery.loss_to_recover) if recovery.active else 0,
                recovered_amount=float(recovery.recovered_amount) if recovery.active else 0,
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
            consecutive_losses=consecutive_losses,
            consecutive_wins=consecutive_wins,
            daily_loss=daily_loss,
            daily_profit=daily_profit,
            daily_loss_limit=max_allowed_loss,
            daily_profit_target=max_allowed_profit,
            session_profit=current_session_profit,
            daily_loss_hit=daily_loss_hit,
            daily_profit_hit=daily_profit_hit,
            session_take_profit_hit=session_take_profit_hit,
            recovery_active=recovery.active,
            loss_to_recover=recovery.loss_to_recover if recovery.active else Decimal("0"),
            recovered_amount=recovery.recovered_amount if recovery.active else Decimal("0"),
        )

    async def record_trade_outcome(self, account_id: int, was_win: bool, profit: Decimal, stake: Decimal) -> None:
        """Record outcome and keep recovery active until the full loss debt is recovered."""
        normalized_profit = Decimal(str(profit or 0))
        normalized_stake = Decimal(str(stake or 0))

        bucket = self._outcome_cache.get(account_id, {"wins": 0, "losses": 0, "net": Decimal("0")})
        bucket["wins"] = int(bucket.get("wins", 0)) + (1 if was_win else 0)
        bucket["losses"] = int(bucket.get("losses", 0)) + (0 if was_win else 1)
        bucket["net"] = Decimal(str(bucket.get("net", Decimal("0")))) + normalized_profit
        self._outcome_cache[account_id] = bucket

        recovery = self._get_recovery_state(account_id)

        if was_win:
            if not recovery.active:
                return

            if normalized_profit > 0:
                recovery.recovered_amount += normalized_profit

            remaining = recovery.loss_to_recover - recovery.recovered_amount
            log_info(
                "Recovery progress",
                account_id=account_id,
                recovered_amount=float(recovery.recovered_amount),
                loss_to_recover=float(recovery.loss_to_recover),
                remaining=float(max(Decimal("0"), remaining)),
            )

            if recovery.recovered_amount >= recovery.loss_to_recover:
                log_info(
                    "Recovery completed",
                    account_id=account_id,
                    recovered_amount=float(recovery.recovered_amount),
                    loss_to_recover=float(recovery.loss_to_recover),
                )
                self._recovery_state[account_id] = RecoveryState()
            return

        # Losing outcome starts/continues recovery debt.
        loss_amount = abs(normalized_profit) if normalized_profit < 0 else normalized_stake
        if loss_amount <= 0:
            return

        if not recovery.active:
            recovery.active = True
            recovery.initial_stake = normalized_stake if normalized_stake > 0 else self.min_stake
            recovery.current_level = 1 if len(self.fibonacci_sequence) > 1 else 0
            recovery.loss_to_recover = loss_amount
            recovery.recovered_amount = Decimal("0")
        else:
            recovery.loss_to_recover += loss_amount
            recovery.current_level = min(recovery.current_level + 1, len(self.fibonacci_sequence) - 1)

        log_info(
            "Recovery debt updated",
            account_id=account_id,
            loss_amount=float(loss_amount),
            loss_to_recover=float(recovery.loss_to_recover),
            recovered_amount=float(recovery.recovered_amount),
            recovery_level=recovery.current_level,
            multiplier=float(self.fibonacci_sequence[recovery.current_level]),
            base_stake=float(recovery.initial_stake),
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
    def _calculate_daily_net_profit(self, account: Account) -> Decimal:
        """Calculate realized net profit for today (wins - losses)."""
        today = timezone.now().date()
        trades = Trade.objects.filter(
            account=account,
            created_at__date=today,
            status__in=[Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_FAILED],
        )
        
        total = Decimal("0")
        for trade in trades:
            if trade.profit:
                total += trade.profit
        
        return total
    
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
    def _count_consecutive_wins(self, account: Account) -> int:
        """Count current consecutive winning trades."""
        recent_trades = Trade.objects.filter(
            account=account,
            status__in=[Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_FAILED],
        ).order_by("-created_at")[:10]

        consecutive = 0
        for trade in recent_trades:
            if trade.status == Trade.STATUS_WON:
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

    @sync_to_async
    def _get_recent_streak_losses(self, account: Account, count: int) -> List[Decimal]:
        """Get exact loss amounts from the current consecutive losing streak."""
        if count <= 0:
            return []

        recent_trades = list(
            Trade.objects.filter(
                account=account,
                status__in=[Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_FAILED],
            ).order_by("-created_at")[: count + 1]
        )

        losses: List[Decimal] = []
        for trade in recent_trades:
            if len(losses) >= count:
                break
            if trade.status in {Trade.STATUS_LOST, Trade.STATUS_FAILED}:
                if trade.profit is not None:
                    losses.append(abs(Decimal(str(trade.profit))))
                elif trade.stake is not None:
                    losses.append(abs(Decimal(str(trade.stake))))
                else:
                    losses.append(self.min_stake)
            else:
                break
        return losses

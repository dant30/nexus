"""
Trading engine selectors for read-only data queries.
"""

from decimal import Decimal
from typing import List, Dict, Optional
from datetime import datetime, timedelta

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.trades.models import Trade
from django_core.accounts.models import Account
from django_core.billing.models import Transaction

User = get_user_model()


class TradeSelector:
    """Selectors for trade data queries."""
    
    @staticmethod
    def get_recent_trades(user: User, limit: int = 50) -> List[Trade]:
        """Get user's recent trades."""
        return Trade.objects.filter(user=user).order_by("-created_at")[:limit]
    
    @staticmethod
    def get_today_trades(user: User) -> List[Trade]:
        """Get today's trades."""
        from django.utils import timezone
        today = timezone.now().date()
        
        return Trade.objects.filter(
            user=user,
            created_at__date=today,
        ).order_by("-created_at")
    
    @staticmethod
    def get_profitable_trades(user: User) -> List[Trade]:
        """Get profitable trades only."""
        return Trade.objects.filter(
            user=user,
            profit__gt=0,
        ).order_by("-created_at")
    
    @staticmethod
    def get_losing_trades(user: User) -> List[Trade]:
        """Get losing trades only."""
        return Trade.objects.filter(
            user=user,
            profit__lt=0,
        ).order_by("-created_at")
    
    @staticmethod
    def calculate_win_rate(user: User) -> float:
        """Calculate win rate as percentage."""
        total_trades = Trade.objects.filter(user=user).count()
        
        if total_trades == 0:
            return 0.0
        
        won_trades = Trade.objects.filter(
            user=user,
            status=Trade.STATUS_WON,
        ).count()
        
        return (won_trades / total_trades) * 100
    
    @staticmethod
    def calculate_total_profit(user: User) -> Decimal:
        """Calculate total profit/loss."""
        trades = Trade.objects.filter(user=user)
        total = Decimal("0")
        
        for trade in trades:
            if trade.profit:
                total += trade.profit
        
        return total


class AccountSelector:
    """Selectors for account data queries."""
    
    @staticmethod
    def get_account_stats(account: Account) -> Dict:
        """Get comprehensive account statistics."""
        trades = Trade.objects.filter(account=account)
        
        total_trades = trades.count()
        won_trades = trades.filter(status=Trade.STATUS_WON).count()
        lost_trades = trades.filter(status=Trade.STATUS_LOST).count()
        open_trades = trades.filter(status=Trade.STATUS_OPEN).count()
        
        total_profit = sum(t.profit or Decimal("0") for t in trades)
        total_stake = sum(t.stake for t in trades)
        
        win_rate = (won_trades / total_trades * 100) if total_trades > 0 else 0
        roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
        
        return {
            "account_id": account.id,
            "balance": str(account.balance),
            "total_trades": total_trades,
            "won_trades": won_trades,
            "lost_trades": lost_trades,
            "open_trades": open_trades,
            "win_rate": float(win_rate),
            "total_profit": str(total_profit),
            "roi": float(roi),
        }
    
    @staticmethod
    def get_daily_balance_history(account: Account, days: int = 30) -> List[Dict]:
        """Get daily closing balance for chart."""
        from django.utils import timezone
        from django.db.models import Sum
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        history = []
        current_date = start_date
        
        while current_date <= end_date:
            # Calculate balance at end of day
            transactions = Transaction.objects.filter(
                account=account,
                created_at__date__lte=current_date,
            )
            
            total_transactions = transactions.aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0")
            
            balance = account.balance - total_transactions
            history.append({
                "date": current_date.isoformat(),
                "balance": str(balance),
            })
            
            current_date += timedelta(days=1)
        
        return history


class RiskSelector:
    """Selectors for risk metrics."""
    
    @staticmethod
    def get_equity_curve(user: User, limit: int = 100) -> List[Dict]:
        """Get equity curve for charting."""
        trades = Trade.objects.filter(user=user).order_by("created_at")[:limit]
        
        curve = []
        cumulative_profit = Decimal("0")
        
        for trade in trades:
            if trade.profit:
                cumulative_profit += trade.profit
            
            curve.append({
                "timestamp": trade.created_at.isoformat(),
                "equity": str(cumulative_profit),
                "trade_id": trade.id,
            })
        
        return curve
    
    @staticmethod
    def get_drawdown(user: User) -> Dict:
        """Calculate maximum drawdown."""
        trades = Trade.objects.filter(user=user).order_by("created_at")
        
        max_equity = Decimal("0")
        max_drawdown = Decimal("0")
        cumulative = Decimal("0")
        
        for trade in trades:
            if trade.profit:
                cumulative += trade.profit
            
            if cumulative > max_equity:
                max_equity = cumulative
            
            drawdown = max_equity - cumulative
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        drawdown_percent = (
            (max_drawdown / max_equity * 100)
            if max_equity > 0
            else 0
        )
        
        return {
            "max_drawdown": str(max_drawdown),
            "max_drawdown_percent": float(drawdown_percent),
            "max_equity": str(max_equity),
        }


"""
Read-only data selectors for trading engine.
Queries market data from Deriv or cache.
"""
from typing import List, Dict, Optional
from decimal import Decimal

from shared.utils.logger import log_info, get_logger

logger = get_logger("selector")


class MarketDataSelector:
    """
    Fetch and select market data for analysis.
    """
    
    @staticmethod
    def get_candles(
        symbol: str,
        period: int = 60,
        count: int = 100,
    ) -> List[Dict]:
        """
        Get OHLC candle data for a symbol.
        
        Args:
        - symbol: Trading symbol (e.g., "EURUSD")
        - period: Candle period in seconds
        - count: Number of candles to return
        
        Returns:
        - List of candle dicts: {open, high, low, close, volume, time}
        
        Note: In production, fetch from Deriv API or cache
        """
        # TODO: Implement actual fetch from Deriv API
        # For now, return empty list
        return []
    
    @staticmethod
    def get_ticks(symbol: str, count: int = 100) -> List[float]:
        """
        Get recent tick prices for a symbol.
        
        Args:
        - symbol: Trading symbol
        - count: Number of ticks to return
        
        Returns:
        - List of recent tick prices
        
        Note: In production, fetch from Deriv WebSocket or cache
        """
        # TODO: Implement actual fetch from Deriv WebSocket
        # For now, return empty list
        return []
    
    @staticmethod
    def get_bid_ask(symbol: str) -> Optional[Dict]:
        """
        Get current bid/ask prices.
        
        Args:
        - symbol: Trading symbol
        
        Returns:
        - Dict with {bid, ask, spread} or None
        """
        # TODO: Implement actual fetch from Deriv API
        # For now, return None
        return None

"""
Commission and markup calculation engine.
Handles profit sharing and platform fees.
"""

from decimal import Decimal
from enum import Enum
from typing import Optional, Dict
from dataclasses import dataclass

from shared.utils.logger import log_info, get_logger

logger = get_logger("commission")


class CommissionType(str, Enum):
    """Types of commissions."""
    REFERRER = "REFERRER"  # Commission for referring users
    AFFILIATE = "AFFILIATE"  # Affiliate program commission
    MARKUP = "MARKUP"  # Platform markup on payouts


@dataclass
class CommissionBreakdown:
    """Breakdown of commission calculation."""
    gross_payout: Decimal
    platform_markup: Decimal
    referrer_commission: Decimal
    affiliate_commission: Decimal
    net_payout: Decimal
    markup_percentage: Decimal


class CommissionCalculator:
    """
    Calculate commissions and markups on trades.
    
    Structure:
    - Platform markup: Base fee on all trades
    - Referrer commission: % of platform profit for user's referrer
    - Affiliate commission: % of platform profit for affiliates
    """
    
    # Default rates (configurable)
    DEFAULT_PLATFORM_MARKUP = Decimal("0.05")  # 5% markup
    DEFAULT_REFERRER_COMMISSION = Decimal("0.10")  # 10% of platform profit
    DEFAULT_AFFILIATE_COMMISSION = Decimal("0.15")  # 15% of platform profit
    
    def __init__(
        self,
        platform_markup: Optional[Decimal] = None,
        referrer_commission: Optional[Decimal] = None,
        affiliate_commission: Optional[Decimal] = None,
    ):
        """
        Initialize commission calculator.
        
        Args:
        - platform_markup: Percentage markup on payouts (0.0-1.0)
        - referrer_commission: % of platform profit for referrers
        - affiliate_commission: % of platform profit for affiliates
        """
        self.platform_markup = platform_markup or self.DEFAULT_PLATFORM_MARKUP
        self.referrer_commission = referrer_commission or self.DEFAULT_REFERRER_COMMISSION
        self.affiliate_commission = affiliate_commission or self.DEFAULT_AFFILIATE_COMMISSION
    
    def calculate_trade_commission(
        self,
        stake: Decimal,
        payout: Decimal,
        user_markup: Decimal = Decimal("0"),
    ) -> CommissionBreakdown:
        """
        Calculate commission breakdown for a trade.
        
        Args:
        - stake: Initial trade stake/bet
        - payout: Total payout from Deriv
        - user_markup: Additional user-specific markup (0.0-1.0)
        
        Returns:
        - CommissionBreakdown with all calculations
        """
        # Calculate gross profit (payout - stake)
        gross_profit = payout - stake
        
        # Calculate platform markup (% of payout for winning trades)
        if gross_profit > 0:
            effective_markup = self.platform_markup + user_markup
            platform_markup_amount = payout * effective_markup
        else:
            # No markup on losing trades
            platform_markup_amount = Decimal("0")
            effective_markup = Decimal("0")
        
        # Net payout to user
        net_payout = payout - platform_markup_amount
        
        # Commission for referrer (% of platform markup)
        referrer_commission = platform_markup_amount * self.referrer_commission
        
        # Commission for affiliate (% of platform markup)
        affiliate_commission = platform_markup_amount * self.affiliate_commission
        
        log_info(
            "Trade commission calculated",
            stake=float(stake),
            payout=float(payout),
            platform_markup=float(platform_markup_amount),
            net_payout=float(net_payout),
        )
        
        return CommissionBreakdown(
            gross_payout=payout,
            platform_markup=platform_markup_amount,
            referrer_commission=referrer_commission,
            affiliate_commission=affiliate_commission,
            net_payout=net_payout,
            markup_percentage=effective_markup,
        )
    
    def calculate_referrer_commission(
        self,
        referrer_profit: Decimal,
    ) -> Decimal:
        """
        Calculate one-time commission for user referral.
        
        Args:
        - referrer_profit: Total platform profit from referrer's trades
        
        Returns:
        - Commission amount for referrer
        """
        return referrer_profit * self.referrer_commission

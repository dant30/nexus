# In django_core/trades/services.py - UPDATE create_trade function

from decimal import Decimal
from django.db import transaction
from .models import Trade
from django_core.accounts.selectors import get_default_account


def create_trade(
    user,
    contract_type,
    direction,
    stake: Decimal,
    account=None,
    duration_seconds: int = None,
    proposal_id: str = None,
    trade_type: str = Trade.TRADE_TYPE_CALL_PUT,
    contract: str = Trade.CONTRACT_CALL,
    signal_id: str = None,  # NEW: Add signal_id parameter
):
    """Create a Trade record (does not place orders on Deriv)."""
    if account is None:
        account = get_default_account(user)
    
    t = Trade.objects.create(
        user=user,
        account=account,
        trade_type=trade_type,
        contract=contract,
        contract_type=contract_type,
        direction=direction,
        stake=stake,
        duration_seconds=duration_seconds,
        proposal_id=proposal_id,
        signal_id=signal_id,  # NEW: Save signal_id
    )
    return t


@transaction.atomic
def close_trade(trade: Trade, payout: Decimal, transaction_id: str = None):
    """Close a trade record, compute profit and update status."""
    trade.transaction_id = transaction_id
    trade.payout = payout
    trade.profit = (payout - trade.stake) if payout is not None else Decimal("0")
    
    if trade.profit > 0:
        trade.status = Trade.STATUS_WON
    elif trade.profit < 0:
        trade.status = Trade.STATUS_LOST
    else:
        trade.status = Trade.STATUS_CLOSED
    
    # Commission/markup calculations are hooks - set to zero here
    trade.commission_applied = Decimal("0")
    trade.markup_applied = Decimal(getattr(trade.user, "markup_percentage", 0))
    trade.save()
    return trade
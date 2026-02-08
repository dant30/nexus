from decimal import Decimal
from django.db import transaction
from .models import Transaction
from accounts.models import Account


@transaction.atomic
def record_transaction(user, tx_type: str, amount: Decimal, account: Account = None, reference: str = None, metadata: dict = None) -> Transaction:
    metadata = metadata or {}
    tx = Transaction.objects.create(user=user, tx_type=tx_type, amount=amount, account=account, reference=reference, metadata=metadata)
    # Apply to account balance immediately for completed transactions (common for trade payouts/markup/commissions)
    if account and tx_type in (Transaction.TYPE_TRADE_PAYOUT, Transaction.TYPE_COMMISSION, Transaction.TYPE_MARKUP, Transaction.TYPE_DEPOSIT):
        account.balance = (account.balance or Decimal("0")) + amount
        account.save(update_fields=["balance", "updated_at"])
        tx.balance_after = account.balance
        tx.status = Transaction.STATUS_COMPLETED
        tx.save(update_fields=["balance_after", "status"])
    return tx

from typing import Optional
from decimal import Decimal
from django.conf import settings
from .models import Account


def create_demo_account(user, currency: str = "USD", initial_balance: Decimal = Decimal("10000.00")) -> Account:
    acc = Account.objects.create(
        user=user,
        account_type=Account.ACCOUNT_DEMO,
        currency=currency,
        balance=initial_balance,
        is_default=True,
        markup_percentage=getattr(user, "markup_percentage", 0),
    )
    return acc


def create_or_update_real_account(user, deriv_account_id: str, currency: str, metadata: dict, is_default: bool = False) -> Account:
    acc, _ = Account.objects.update_or_create(
        user=user, deriv_account_id=deriv_account_id,
        defaults={
            "account_type": Account.ACCOUNT_REAL,
            "currency": currency,
            "metadata": metadata or {},
            "is_default": is_default,
            "markup_percentage": getattr(user, "markup_percentage", 0),
        },
    )
    return acc

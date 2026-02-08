from decimal import Decimal
from django.db import transaction
from .models import CommissionRule, CommissionTransaction


@transaction.atomic
def apply_referral_commission(referred_user, amount: Decimal, reference: str = None):
    """If a user was referred, award commission to the referrer according to their CommissionRule."""
    referrer = getattr(referred_user, "referred_by", None)
    if not referrer:
        return None
    try:
        rule = CommissionRule.objects.get(owner=referrer)
    except CommissionRule.DoesNotExist:
        return None
    # Commission amount relative to the passed amount
    commission_amount = (Decimal(rule.referral_percent) / Decimal(100)) * Decimal(amount)
    ct = CommissionTransaction.objects.create(commission_rule=rule, user=referred_user, amount=commission_amount, reference=reference or "referral")
    return ct


@transaction.atomic
def record_markup_payment(owner_user, payer_user, amount: Decimal, reference: str = None):
    try:
        rule = CommissionRule.objects.get(owner=owner_user)
    except CommissionRule.DoesNotExist:
        return None
    markup_amount = (Decimal(rule.markup_percent) / Decimal(100)) * Decimal(amount)
    ct = CommissionTransaction.objects.create(commission_rule=rule, user=payer_user, amount=markup_amount, reference=reference or "markup")
    return ct

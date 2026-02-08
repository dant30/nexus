from django.utils.crypto import get_random_string
from .models import ReferralCode, Referral


def generate_referral_code(owner, prefix: str = None):
    base = (prefix or owner.username)[:20].upper()
    code = f"{base}-{get_random_string(6).upper()}"
    rc = ReferralCode.objects.create(code=code, owner=owner)
    return rc


def register_referral(code_str, referred_user):
    try:
        rc = ReferralCode.objects.get(code=code_str)
    except ReferralCode.DoesNotExist:
        return None
    ref = Referral.objects.create(code=rc, referred_user=referred_user)
    rc.uses = rc.uses + 1
    rc.save(update_fields=["uses"])
    return ref

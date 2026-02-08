from .models import ReferralCode, Referral


def get_referral_for_user(user):
    return Referral.objects.filter(referred_user=user).first()


def get_codes_for_owner(owner):
    return ReferralCode.objects.filter(owner=owner)

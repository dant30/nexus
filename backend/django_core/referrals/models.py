from django.db import models
from django.conf import settings
from django.utils import timezone


class ReferralCode(models.Model):
    code = models.CharField(max_length=64, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referral_codes")
    uses = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.code} -> {self.owner}"


class Referral(models.Model):
    code = models.ForeignKey(ReferralCode, on_delete=models.SET_NULL, null=True, related_name="referrals")
    referred_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referred_entries")
    created_at = models.DateTimeField(default=timezone.now)
    commission_awarded = models.BooleanField(default=False)

    def __str__(self):
        return f"Referral {self.referred_user} via {self.code}"

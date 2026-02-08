from django.db import models
from django.conf import settings
from django.utils import timezone


class CommissionRule(models.Model):
    """Defines commission percentages for an affiliate (owner).

    - `referral_percent`: percent earned when a referred user signs up / funds
    - `markup_percent`: percent applied as markup on trades executed via the bot
    """

    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commission_rule")
    referral_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    markup_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CommissionRule({self.owner})"


class CommissionTransaction(models.Model):
    commission_rule = models.ForeignKey(CommissionRule, on_delete=models.CASCADE, related_name="transactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commission_transactions")
    amount = models.DecimalField(max_digits=20, decimal_places=6)
    reference = models.CharField(max_length=128, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Commission {self.amount} to {self.commission_rule.owner} from {self.user}"

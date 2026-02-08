from django.db import models
from django.conf import settings
from django.utils import timezone


class Trade(models.Model):
	CONTRACT_CALL = "CALL"
	CONTRACT_PUT = "PUT"
	CONTRACT_CHOICES = ((CONTRACT_CALL, "Call"), (CONTRACT_PUT, "Put"))

	DIRECTION_RISE = "RISE"
	DIRECTION_FALL = "FALL"
	DIRECTION_CHOICES = ((DIRECTION_RISE, "Rise"), (DIRECTION_FALL, "Fall"))

	STATUS_OPEN = "OPEN"
	STATUS_CLOSED = "CLOSED"
	STATUS_WON = "WON"
	STATUS_LOST = "LOST"
	STATUS_CANCELLED = "CANCELLED"
	STATUS_CHOICES = ((STATUS_OPEN, "Open"), (STATUS_CLOSED, "Closed"), (STATUS_WON, "Won"), (STATUS_LOST, "Lost"), (STATUS_CANCELLED, "Cancelled"))

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trades")
	account = models.ForeignKey("accounts.Account", null=True, blank=True, on_delete=models.SET_NULL, related_name="trades")
	contract_type = models.CharField(max_length=10, choices=CONTRACT_CHOICES)
	direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
	stake = models.DecimalField(max_digits=20, decimal_places=6)
	payout = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
	profit = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)

	proposal_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
	transaction_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)

	duration_seconds = models.PositiveIntegerField(null=True, blank=True)
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)

	commission_applied = models.DecimalField(max_digits=10, decimal_places=4, default=0)
	markup_applied = models.DecimalField(max_digits=10, decimal_places=4, default=0)

	created_at = models.DateTimeField(default=timezone.now)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ("-created_at",)

	def __str__(self):
		return f"Trade {self.id}: {self.user} {self.contract_type} {self.direction} {self.stake}"


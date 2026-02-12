from django.db import models
from django.conf import settings
from django.utils import timezone


class Trade(models.Model):
	"""Trade model."""
	
	TRADE_TYPE_RISE_FALL = "RISE_FALL"
	TRADE_TYPE_CALL_PUT = "CALL_PUT"
	TRADE_TYPE_CHOICES = (
		(TRADE_TYPE_RISE_FALL, "Rise/Fall"),
		(TRADE_TYPE_CALL_PUT, "Call/Put"),
	)

	CONTRACT_RISE = "RISE"
	CONTRACT_FALL = "FALL"
	CONTRACT_CALL = "CALL"
	CONTRACT_PUT = "PUT"
	USER_CONTRACT_CHOICES = (
		(CONTRACT_RISE, "Rise"),
		(CONTRACT_FALL, "Fall"),
		(CONTRACT_CALL, "Call"),
		(CONTRACT_PUT, "Put"),
	)
	CONTRACT_CHOICES = ((CONTRACT_CALL, "Call"), (CONTRACT_PUT, "Put"))

	DIRECTION_RISE = "RISE"
	DIRECTION_FALL = "FALL"
	DIRECTION_CHOICES = ((DIRECTION_RISE, "Rise"), (DIRECTION_FALL, "Fall"))

	STATUS_OPEN = "OPEN"
	STATUS_WON = "WON"
	STATUS_LOST = "LOST"
	STATUS_CLOSED = "CLOSED"
	STATUS_CANCELLED = "CANCELLED"
	STATUS_FAILED = "FAILED"  # NEW: Trade creation failed
	STATUS_CHOICES = [
		(STATUS_OPEN, "Open"),
		(STATUS_WON, "Won"),
		(STATUS_LOST, "Lost"),
		(STATUS_CLOSED, "Closed"),
		(STATUS_CANCELLED, "Cancelled"),
		(STATUS_FAILED, "Failed"),  # NEW
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trades")
	account = models.ForeignKey("accounts.Account", null=True, blank=True, on_delete=models.SET_NULL, related_name="trades")
	trade_type = models.CharField(max_length=20, choices=TRADE_TYPE_CHOICES, default=TRADE_TYPE_CALL_PUT)
	contract = models.CharField(max_length=10, choices=USER_CONTRACT_CHOICES, default=CONTRACT_CALL)
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
		return f"Trade {self.id}: {self.user} {self.trade_type} {self.contract} {self.stake}"


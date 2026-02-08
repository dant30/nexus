from django.db import models
from django.conf import settings
from django.utils import timezone


class Transaction(models.Model):
	TYPE_DEPOSIT = "DEPOSIT"
	TYPE_WITHDRAWAL = "WITHDRAWAL"
	TYPE_COMMISSION = "COMMISSION"
	TYPE_MARKUP = "MARKUP"
	TYPE_TRADE_PAYOUT = "TRADE_PAYOUT"
	TYPE_CHOICES = (
		(TYPE_DEPOSIT, "Deposit"),
		(TYPE_WITHDRAWAL, "Withdrawal"),
		(TYPE_COMMISSION, "Commission"),
		(TYPE_MARKUP, "Markup"),
		(TYPE_TRADE_PAYOUT, "Trade Payout"),
	)

	STATUS_PENDING = "PENDING"
	STATUS_COMPLETED = "COMPLETED"
	STATUS_FAILED = "FAILED"
	STATUS_CHOICES = ((STATUS_PENDING, "Pending"), (STATUS_COMPLETED, "Completed"), (STATUS_FAILED, "Failed"))

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
	account = models.ForeignKey("accounts.Account", null=True, blank=True, on_delete=models.SET_NULL, related_name="transactions")
	tx_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
	amount = models.DecimalField(max_digits=20, decimal_places=6)
	reference = models.CharField(max_length=128, blank=True, null=True)
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
	balance_after = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
	metadata = models.JSONField(default=dict, blank=True)

	created_at = models.DateTimeField(default=timezone.now)

	class Meta:
		ordering = ("-created_at",)

	def __str__(self):
		return f"{self.tx_type} {self.amount} for {self.user} ({self.status})"


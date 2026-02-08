from django.db import models
from django.conf import settings
from django.utils import timezone


class Account(models.Model):
	ACCOUNT_DEMO = "DEMO"
	ACCOUNT_REAL = "REAL"
	ACCOUNT_TYPE_CHOICES = ((ACCOUNT_DEMO, "Demo"), (ACCOUNT_REAL, "Real"))

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accounts")
	deriv_account_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
	account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default=ACCOUNT_DEMO)
	currency = models.CharField(max_length=8, default="USD")
	balance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
	metadata = models.JSONField(default=dict, blank=True)
	is_default = models.BooleanField(default=False)
	markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

	created_at = models.DateTimeField(default=timezone.now)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ("-is_default", "-created_at")

	def __str__(self):
		return f"{self.user} - {self.account_type} ({self.currency})"


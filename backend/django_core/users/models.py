from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
	"""Custom User model.

	- `markup_percentage`: percent the user's bot charges (e.g. 2.5 means 2.5%).
	- `referred_by`: optional reference to another `User` who referred them.
	"""

	email = models.EmailField(unique=True)
	is_email_verified = models.BooleanField(default=False)
	referred_by = models.ForeignKey(
		"self",
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name="referrals",
	)
	affiliate_code = models.CharField(max_length=32, blank=True, null=True, unique=True)
	markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
	deriv_id = models.CharField(max_length=32, blank=True, null=True)
	deriv_login_id = models.CharField(max_length=32, blank=True, null=True)
	deriv_currency = models.CharField(max_length=16, blank=True, null=True)
	deriv_full_name = models.CharField(max_length=255, blank=True, null=True)
	deriv_email_verified = models.BooleanField(default=False)
	deriv_country = models.CharField(max_length=8, blank=True, null=True)
	deriv_account_type = models.CharField(max_length=32, blank=True, null=True)
	deriv_is_virtual = models.BooleanField(default=False)
	deriv_accounts = models.JSONField(default=list, blank=True)
	deriv_access_token = models.TextField(blank=True, null=True)

	created_at = models.DateTimeField(default=timezone.now)
	updated_at = models.DateTimeField(auto_now=True)

	REQUIRED_FIELDS = ["email"]

	def __str__(self):
		return self.get_username()


from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Account(models.Model):
    """
    Deriv account model with integrated bot settings.
    """

    # =====================
    # ACCOUNT TYPES
    # =====================
    TYPE_REAL = "REAL"
    TYPE_DEMO = "DEMO"

    TYPE_CHOICES = (
        (TYPE_REAL, "Real"),
        (TYPE_DEMO, "Demo"),
    )

    # =====================
    # STATUS
    # =====================
    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"
    STATUS_DISABLED = "DISABLED"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_DISABLED, "Disabled"),
    )

    # =====================
    # CORE ACCOUNT FIELDS
    # =====================
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="accounts",
    )

    # replaces deriv_account_id
    account_id = models.CharField(
		max_length=50,
		unique=True,
		db_index=True,
		help_text="Deriv login ID",
	)



    account_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        default=TYPE_DEMO,
    )

    currency = models.CharField(max_length=10, default="USD")

    balance = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        default=Decimal("0"),
    )

    is_default = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    metadata = models.JSONField(default=dict, blank=True)

    markup_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    # =====================
    # BOT SETTINGS
    # =====================
    bot_enabled = models.BooleanField(default=False)
    bot_symbol = models.CharField(max_length=20, blank=True, null=True)

    bot_strategy = models.CharField(max_length=50, default="scalping")

    bot_stake = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        blank=True,
        null=True,
    )

    bot_duration = models.IntegerField(blank=True, null=True)

    bot_duration_unit = models.CharField(max_length=5, default="m")

    bot_trade_type = models.CharField(max_length=20, default="RISE_FALL")

    bot_contract = models.CharField(max_length=10, default="RISE")

    bot_min_confidence = models.FloatField(default=0.7)

    bot_cooldown_seconds = models.IntegerField(default=30)

    bot_max_trades_per_session = models.IntegerField(default=0)

    bot_follow_signal = models.BooleanField(default=True)

    bot_daily_loss_limit = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        blank=True,
        null=True,
    )

    # =====================
    # TIMESTAMPS
    # =====================
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # =====================
    # META
    # =====================
    class Meta:
        ordering = ("-is_default", "-created_at")

    # =====================
    # METHODS
    # =====================
    def __str__(self):
        return f"{self.account_id} ({self.account_type}) — {self.currency} {self.balance}"

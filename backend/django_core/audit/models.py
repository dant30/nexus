from django.db import models
from django.conf import settings
from django.utils import timezone


class AuditLog(models.Model):
    """Capture audit trails of critical actions."""

    ACTION_USER_LOGIN = "USER_LOGIN"
    ACTION_USER_LOGOUT = "USER_LOGOUT"
    ACTION_TRADE_CREATED = "TRADE_CREATED"
    ACTION_TRADE_CLOSED = "TRADE_CLOSED"
    ACTION_WITHDRAWAL = "WITHDRAWAL"
    ACTION_DEPOSIT = "DEPOSIT"
    ACTION_COMMISSION_AWARDED = "COMMISSION_AWARDED"
    ACTION_CHOICES = (
        (ACTION_USER_LOGIN, "User Login"),
        (ACTION_USER_LOGOUT, "User Logout"),
        (ACTION_TRADE_CREATED, "Trade Created"),
        (ACTION_TRADE_CLOSED, "Trade Closed"),
        (ACTION_WITHDRAWAL, "Withdrawal"),
        (ACTION_DEPOSIT, "Deposit"),
        (ACTION_COMMISSION_AWARDED, "Commission Awarded"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.action} {self.user} at {self.created_at}"

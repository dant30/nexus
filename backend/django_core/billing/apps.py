"""Billing app configuration."""
from django.apps import AppConfig


class BillingConfig(AppConfig):
    """Configuration for the Billing app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.billing"
    verbose_name = "Billing"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.billing.signals  # noqa: F401

"""Referrals app configuration."""
from django.apps import AppConfig


class ReferralsConfig(AppConfig):
    """Configuration for the Referrals app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.referrals"
    verbose_name = "Referrals"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.referrals.signals  # noqa: F401

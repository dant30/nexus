"""Trades app configuration."""
from django.apps import AppConfig


class TradesConfig(AppConfig):
    """Configuration for the Trades app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.trades"
    verbose_name = "Trades"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.trades.signals  # noqa: F401

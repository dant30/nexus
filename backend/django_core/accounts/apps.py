"""Accounts app configuration."""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuration for the Accounts app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.accounts"
    verbose_name = "Accounts"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.accounts.signals  # noqa: F401

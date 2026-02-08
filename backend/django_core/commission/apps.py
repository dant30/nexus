"""Commission app configuration."""
from django.apps import AppConfig


class CommissionConfig(AppConfig):
    """Configuration for the Commission app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.commission"
    verbose_name = "Commission"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.commission.signals  # noqa: F401

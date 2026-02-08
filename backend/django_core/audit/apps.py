"""Audit app configuration."""
from django.apps import AppConfig


class AuditConfig(AppConfig):
    """Configuration for the Audit app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.audit"
    verbose_name = "Audit"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.audit.signals  # noqa: F401

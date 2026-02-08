"""Notifications app configuration."""
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuration for the Notifications app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.notifications"
    verbose_name = "Notifications"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.notifications.signals  # noqa: F401

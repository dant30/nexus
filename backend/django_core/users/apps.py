"""Users app configuration."""
from django.apps import AppConfig


class UsersConfig(AppConfig):
    """Configuration for the Users app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "django_core.users"
    verbose_name = "django_core.Users"

    def ready(self):
        """Import signals when app is ready."""
        import django_core.users.signals  # noqa: F401

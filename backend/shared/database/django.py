"""Django ORM setup for FastAPI integration."""
import django
import os
from django.conf import settings


def setup_django():
    """Initialize Django ORM for use in FastAPI.
    
    Call this early in your FastAPI app startup:
    
    @app.on_event("startup")
    async def startup():
        setup_django()
    """
    if not settings.configured:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_core.config.settings.dev")
        django.setup()


def get_user_model():
    """Get the User model (requires Django to be setup first)."""
    from django.contrib.auth import get_user_model as django_get_user_model
    return django_get_user_model()

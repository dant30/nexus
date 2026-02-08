# backend/django_core/config/settings/dev.py
"""
Django settings for Nexus Trading Bot - Development environment.
"""
from .base import *
from shared.settings.env import env

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Allow all CORS origins in development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Email backend for development (console)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Database - local PostgreSQL during development
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env.get("DB_NAME", "nexus_db"),
        "USER": env.get("DB_USER", "postgres"),
        "PASSWORD": env.get("DB_PASSWORD", "postgres"),
        "HOST": env.get("DB_HOST", "localhost"),
        "PORT": env.get_int("DB_PORT", 5432),
        "ATOMIC_REQUESTS": True,
    }
}

# Run synchronously in development
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Enable debug toolbar in development
INSTALLED_APPS += [
    "django_extensions",
]

# More verbose logging in development
LOGGING["loggers"]["django"]["level"] = "DEBUG"

# Development security settings (relaxed)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

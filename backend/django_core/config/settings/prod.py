"""
Django settings for Nexus Trading Bot - Production environment.
"""
from .base import *
from shared.settings.env import env

DEBUG = False
ALLOWED_HOSTS = env.get_list("ALLOWED_HOSTS", ["nexus.example.com"])

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS settings for production
CORS_ALLOWED_ORIGINS = env.get_list("CORS_ALLOWED_ORIGINS", [])

# Database - Must be configured via environment variables
DATABASES = {
    "default": {
        "ENGINE": env.get("DB_ENGINE", "django.db.backends.postgresql"),
        "NAME": env.get("DB_NAME"),
        "USER": env.get("DB_USER"),
        "PASSWORD": env.get("DB_PASSWORD"),
        "HOST": env.get("DB_HOST"),
        "PORT": env.get_int("DB_PORT", 5432),
        "ATOMIC_REQUESTS": True,
        "CONN_MAX_AGE": 60,
    }
}

# Email backend for production
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env.get("EMAIL_HOST")
EMAIL_PORT = env.get_int("EMAIL_PORT", 587)
EMAIL_USE_TLS = env.get_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = env.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env.get("EMAIL_HOST_PASSWORD")

# Run tasks asynchronously in production
CELERY_TASK_ALWAYS_EAGER = False

# Logging level for production
LOGGING["loggers"]["django"]["level"] = "INFO"

# Compress static files
INSTALLED_APPS += [
    "compressor",
]

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

# Cache configuration for production (Redis)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env.get("REDIS_URL", "redis://localhost:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {"max_connections": 50},
        },
    }
}

# Session configuration (use cache in production)
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

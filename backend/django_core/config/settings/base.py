# backend/django_core/config/settings/base.py
"""
Django settings for Nexus Trading Bot - Base (common) settings.
"""
import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from shared.settings.env import env

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DJANGO_CORE_DIR = Path(__file__).resolve().parent.parent

# Email configuration
EMAIL_BACKEND = env.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env.get("EMAIL_HOST", "localhost")
EMAIL_PORT = env.get_int("EMAIL_PORT", 1025)
EMAIL_USE_TLS = env.get_bool("EMAIL_USE_TLS", False)
EMAIL_HOST_USER = env.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env.get("EMAIL_HOST_PASSWORD", "")

# SECURITY
SECRET_KEY = env.get("SECRET_KEY", "django-insecure-dev-key-change-in-production")
DEBUG = env.get_bool("DEBUG", False)
ALLOWED_HOSTS = env.get_list("ALLOWED_HOSTS", ["*"])
CSRF_TRUSTED_ORIGINS = env.get_list("CSRF_TRUSTED_ORIGINS", ["http://localhost:3000", "http://localhost:8000"])

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

LOCAL_APPS = [
    "django_core.users.apps.UsersConfig",
    "django_core.accounts.apps.AccountsConfig",
    "django_core.trades.apps.TradesConfig",
    "django_core.billing.apps.BillingConfig",
    "django_core.commission.apps.CommissionConfig",
    "django_core.referrals.apps.ReferralsConfig",
    "django_core.notifications.apps.NotificationsConfig",
    "django_core.audit.apps.AuditConfig",
]


THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "corsheaders",
]

INSTALLED_APPS = DJANGO_APPS + LOCAL_APPS + THIRD_PARTY_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "django_core.config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(DJANGO_CORE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "django_core.config.wsgi.application"

# Database
DATABASE_URL = env.get("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": env.get("DB_ENGINE", "django.db.backends.postgresql"),
            "NAME": env.get("DB_NAME", "nexus_db"),
            "USER": env.get("DB_USER", "postgres"),
            "PASSWORD": env.get("DB_PASSWORD", "postgres"),
            "HOST": env.get("DB_HOST", "localhost"),
            "PORT": env.get_int("DB_PORT", 5432),
            "ATOMIC_REQUESTS": True,
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User model
AUTH_USER_MODEL = "users.User"

# Logging configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": os.path.join(BASE_DIR, "logs", "django.log"),
            "maxBytes": 1024 * 1024 * 10,
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": env.get("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "trading": {
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# REST Framework configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# JWT configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
}

# CORS configuration
CORS_ALLOWED_ORIGINS = env.get_list(
    "CORS_ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
)
CORS_ALLOW_CREDENTIALS = True

# Celery (async tasks) - optional
CELERY_BROKER_URL = env.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["application/json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# Cache configuration
CACHES = {
    "default": {
        "BACKEND": env.get("CACHE_BACKEND", "django.core.cache.backends.redis.RedisCache"),
        "LOCATION": env.get("CACHE_LOCATION", "redis://127.0.0.1:6379/1"),
    }
}

# Create logs directory if it doesn't exist
LOGS_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Django Configuration & Initialization - Complete Setup

This document summarizes all configuration and application initialization files for the Nexus Trading Bot Django project.

---

## 1. Django Entry Point: manage.py

**Location:** `django_core/manage.py`

```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
```

**Usage:**
```bash
python manage.py runserver
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic
```

---

## 2. Admin Customization: admin.py

**Location:** `django_core/admin.py`

```python
"""Django admin site customization."""
from django.contrib import admin

# Customize Django admin site
admin.site.site_header = "Nexus Trading Bot - Admin"
admin.site.site_title = "Nexus Admin"
admin.site.index_title = "Welcome to Nexus Admin"
```

---

## 3. Django Settings Structure

### 3.1 Base Settings: base.py

**Location:** `django_core/config/settings/base.py`

Contains all shared settings:
- **Core Django**: SECRET_KEY, DEBUG, ALLOWED_HOSTS, DATABASES
- **Installed Apps**: Django apps + local apps (users, accounts, trades, billing, etc.) + third-party
- **Middleware**: CORS, security, sessions, auth, messages
- **Templates**: Configuration for template rendering
- **Authentication**: Custom User model from users app
- **Static/Media Files**: File serving paths
- **Logging**: Structured JSON logging with file rotation
- **REST Framework**: Default pagination, authentication (JWT), permissions
- **JWT Configuration**: Token lifetime (1 hour), refresh tokens (7 days)
- **CORS**: Allowed origins for frontend access
- **Celery**: Async tasks via Redis
- **Cache**: Redis caching configuration

**Environment Variables Expected:**
```
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com
DB_ENGINE=django.db.backends.postgresql
DB_NAME=nexus_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
```

### 3.2 Development Settings: dev.py

**Location:** `django_core/config/settings/dev.py`

Development-specific overrides:
- DEBUG = True
- CORS allows all localhost origins
- Email backend: Console (prints to terminal)
- Celery runs synchronously (CELERY_TASK_ALWAYS_EAGER = True)
- Relaxed security settings (no SSL redirect, insecure cookies OK)
- Includes `django_extensions` for additional commands

### 3.3 Production Settings: prod.py

**Location:** `django_core/config/settings/prod.py`

Production-specific overrides:
- DEBUG = False
- SECURE_SSL_REDIRECT = True
- HTTPS-only cookies and CSRF tokens
- HSTS (HTTP Strict Transport Security) enabled
- Email backend: SMTP (real email sending)
- Celery runs asynchronously
- Session stored in Redis cache
- Database connection pooling (CONN_MAX_AGE = 60)

---

## 4. ASGI & WSGI Configuration

### 4.1 ASGI: asgi.py

**Location:** `django_core/config/asgi.py`

```python
"""ASGI config for Nexus Trading Bot."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django_asgi_app = get_asgi_application()
application = django_asgi_app
```

**Usage:** For async servers (e.g., Daphne, Hypercorn) and WebSocket support via Django Channels

### 4.2 WSGI: wsgi.py

**Location:** `django_core/config/wsgi.py`

```python
"""WSGI config for Nexus Trading Bot."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.prod')
application = get_wsgi_application()
```

**Usage:** For production servers (Gunicorn, uWSGI)

```bash
gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

---

## 5. URL Configuration: urls.py

**Location:** `django_core/config/urls.py`

```python
"""URL configuration for Nexus Trading Bot."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Future API endpoints
    # path("api/v1/auth/", include("users.urls")),
    # path("api/v1/accounts/", include("accounts.urls")),
    # path("api/v1/trades/", include("trades.urls")),
    # path("api/v1/billing/", include("billing.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

---

## 6. Django App Initialization Files

Each of the 8 apps follows this pattern:

### 6.1 __init__.py (App Package)

```python
"""[App Name] app."""
default_app_config = "[AppName]Config"
```

### 6.2 apps.py (App Configuration)

**Example: users/apps.py**

```python
"""Users app configuration."""
from django.apps import AppConfig


class UsersConfig(AppConfig):
    """Configuration for the Users app."""
    
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
    verbose_name = "Users"

    def ready(self):
        """Import signals when app is ready."""
        import users.signals  # noqa: F401
```

**Pattern Applied To:**
- users
- accounts
- trades
- billing
- commission
- referrals
- notifications
- audit

---

## 7. Shared Module (Utilities & Setup)

### 7.1 Environment Configuration: shared/settings/env.py

```python
"""Environment configuration utilities."""
import os
from typing import List, Optional


class EnvConfig:
    """Parse and retrieve environment variables with type conversion."""

    def get(self, key: str, default=None):
        """Get environment variable with default fallback."""
        return os.getenv(key, default)

    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get environment variable as boolean."""
        value = os.getenv(key, str(default)).lower()
        return value in ("true", "1", "yes", "on")

    def get_int(self, key: str, default: int = 0) -> int:
        """Get environment variable as integer."""
        try:
            return int(os.getenv(key, default))
        except (TypeError, ValueError):
            return default

    def get_float(self, key: str, default: float = 0.0) -> float:
        """Get environment variable as float."""
        try:
            return float(os.getenv(key, default))
        except (TypeError, ValueError):
            return default

    def get_list(self, key: str, default: Optional[List] = None) -> List:
        """Get environment variable as list (comma-separated)."""
        if default is None:
            default = []
        value = os.getenv(key)
        if not value:
            return default
        return [item.strip() for item in value.split(",")]


env = EnvConfig()
```

**Usage in Settings:**
```python
from shared.settings.env import env

SECRET_KEY = env.get("SECRET_KEY", "dev-key")
DEBUG = env.get_bool("DEBUG", True)
DB_PORT = env.get_int("DB_PORT", 5432)
ALLOWED_HOSTS = env.get_list("ALLOWED_HOSTS", ["*"])
```

### 7.2 Django ORM Setup: shared/database/django.py

```python
"""Django ORM setup for FastAPI integration."""
import django
import os
from django.conf import settings


def setup_django():
    """Initialize Django ORM for use in FastAPI."""
    if not settings.configured:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
        django.setup()


def get_user_model():
    """Get the User model (requires Django to be setup first)."""
    from django.contrib.auth import get_user_model as django_get_user_model
    return django_get_user_model()
```

**Usage in FastAPI:**
```python
from fastapi import FastAPI
from shared.database.django import setup_django

app = FastAPI()

@app.on_event("startup")
async def startup():
    setup_django()
```

### 7.3 ID Generators: shared/utils/ids.py

```python
"""ID generation utilities."""
import uuid
from django.utils.crypto import get_random_string


def generate_ulid():
    """Generate a ULID-like string (UUID)."""
    return str(uuid.uuid4()).replace("-", "").upper()


def generate_proposal_id():
    """Generate a unique proposal ID for Deriv."""
    return f"PROP-{get_random_string(16).upper()}"


def generate_transaction_id():
    """Generate a unique transaction ID."""
    return f"TXN-{uuid.uuid4().hex.upper()[:20]}"


def generate_affiliate_code(base_username: str = ""):
    """Generate an affiliate/referral code."""
    prefix = (base_username or "REF")[:10].upper()
    suffix = get_random_string(8).upper()
    return f"{prefix}-{suffix}"
```

### 7.4 Logging Utilities: shared/utils/logger.py

```python
"""Logging utilities."""
import logging
import json


logger = logging.getLogger("trading")


def log_info(message: str, **kwargs):
    """Log an info message with structured data."""
    if kwargs:
        logger.info(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.info(message)


def log_error(message: str, exception: Exception = None, **kwargs):
    """Log an error message with optional exception."""
    if exception:
        logger.error(f"{message} | Exception: {str(exception)}", exc_info=True)
    elif kwargs:
        logger.error(f"{message} | {json.dumps(kwargs)}")
    else:
        logger.error(message)


def get_logger(name: str) -> logging.Logger:
    """Get a logger by name."""
    return logging.getLogger(name)
```

### 7.5 Time Utilities: shared/utils/time.py

```python
"""Time and date utilities."""
from datetime import datetime, timedelta, timezone
import time


def get_utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def get_timestamp() -> float:
    """Get current UNIX timestamp."""
    return time.time()


def add_hours(dt: datetime = None, hours: int = 0) -> datetime:
    """Add hours to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(hours=hours)


def add_days(dt: datetime = None, days: int = 0) -> datetime:
    """Add days to a datetime."""
    if dt is None:
        dt = get_utc_now()
    return dt + timedelta(days=days)
```

---

## 8. Quick Start Commands

### Initial Setup

```bash
# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/base.txt
pip install -r requirements/dev.txt  # for development

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files (production)
python manage.py collectstatic --noinput

# Run development server
python manage.py runserver

# Access: http://localhost:8000/admin
```

### Production Deployment

```bash
# Install production dependencies
pip install -r requirements/prod.txt

# Use production settings
export DJANGO_SETTINGS_MODULE=config.settings.prod

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn server
gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

---

## 9. Environment Variables Reference

### Essential (.env file)

```
# Django
SECRET_KEY=your-very-secure-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Database (PostgreSQL)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=nexus_db
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Cache
CACHE_BACKEND=django_redis.cache.RedisCache
CACHE_LOCATION=redis://127.0.0.1:6379/1
```

---

## 10. File Structure Summary

```
django_core/
├── manage.py                          # Entry point
├── admin.py                           # Admin customization
├── config/
│   ├── __init__.py
│   ├── asgi.py                        # ASGI server config
│   ├── wsgi.py                        # WSGI server config
│   ├── urls.py                        # URL routing
│   └── settings/
│       ├── __init__.py
│       ├── base.py                    # Base settings
│       ├── dev.py                     # Development overrides
│       └── prod.py                    # Production overrides
├── users/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── admin.py
│   ├── serializers.py
│   ├── services.py
│   ├── selectors.py
│   └── signals.py
├── accounts/ (same structure as users)
├── trades/
├── billing/
├── commission/
├── referrals/
├── notifications/
└── audit/

shared/
├── __init__.py
├── settings/
│   ├── __init__.py
│   └── env.py                         # Environment config
├── database/
│   ├── __init__.py
│   └── django.py                      # Django ORM setup
└── utils/
    ├── __init__.py
    ├── ids.py                         # ID generators
    ├── logger.py                      # Logging utilities
    └── time.py                        # Time utilities
```

---

## 11. Integration with FastAPI

The Django ORM is separate but can be used with FastAPI:

```python
# fastapi_app/main.py
from fastapi import FastAPI
from shared.database.django import setup_django

app = FastAPI()

@app.on_event("startup")
async def startup():
    """Initialize Django on startup."""
    setup_django()

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    from users.models import User
    user = await sync_to_async(User.objects.get)(id=user_id)
    return {"username": user.username}
```

---

This configuration provides a robust, production-ready Django setup with:
- ✅ Flexible environment-based settings (dev/prod)
- ✅ Proper logging and monitoring
- ✅ Redis caching and async tasks
- ✅ CORS for frontend integration
- ✅ JWT authentication ready
- ✅ FastAPI compatibility
- ✅ Secure by default (HTTPS, HSTS, secure cookies)

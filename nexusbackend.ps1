# nexus.ps
# Backend scaffold generator for Nexus Trading Platform
# Run from the parent directory where /backend should live

$root = "backend"

$dirs = @(
    "$root/fastapi_app/oauth",
    "$root/fastapi_app/deriv_ws",
    "$root/fastapi_app/trading_engine/strategies",
    "$root/fastapi_app/api",
    "$root/fastapi_app/middleware",

    "$root/django_core/config/settings",
    "$root/django_core/users/migrations",
    "$root/django_core/accounts/migrations",
    "$root/django_core/trades/migrations",
    "$root/django_core/billing/migrations",
    "$root/django_core/commission/migrations",
    "$root/django_core/referrals/migrations",
    "$root/django_core/notifications/migrations",
    "$root/django_core/audit/migrations",

    "$root/shared/database",
    "$root/shared/settings",
    "$root/shared/utils",

    "$root/requirements"
)

$files = @(
    # FastAPI core
    "$root/fastapi_app/__init__.py",
    "$root/fastapi_app/main.py",
    "$root/fastapi_app/asgi.py",
    "$root/fastapi_app/deps.py",
    "$root/fastapi_app/config.py",

    # OAuth
    "$root/fastapi_app/oauth/__init__.py",
    "$root/fastapi_app/oauth/routes.py",
    "$root/fastapi_app/oauth/deriv_oauth.py",
    "$root/fastapi_app/oauth/referral.py",
    "$root/fastapi_app/oauth/schemas.py",

    # WebSocket
    "$root/fastapi_app/deriv_ws/__init__.py",
    "$root/fastapi_app/deriv_ws/client.py",
    "$root/fastapi_app/deriv_ws/connection_pool.py",
    "$root/fastapi_app/deriv_ws/handlers.py",
    "$root/fastapi_app/deriv_ws/events.py",
    "$root/fastapi_app/deriv_ws/serializers.py",

    # Trading engine
    "$root/fastapi_app/trading_engine/__init__.py",
    "$root/fastapi_app/trading_engine/engine.py",
    "$root/fastapi_app/trading_engine/selector.py",
    "$root/fastapi_app/trading_engine/signal_consensus.py",
    "$root/fastapi_app/trading_engine/risk_manager.py",
    "$root/fastapi_app/trading_engine/commission.py",

    # Strategies
    "$root/fastapi_app/trading_engine/strategies/__init__.py",
    "$root/fastapi_app/trading_engine/strategies/base.py",
    "$root/fastapi_app/trading_engine/strategies/scalping.py",
    "$root/fastapi_app/trading_engine/strategies/momentum.py",
    "$root/fastapi_app/trading_engine/strategies/breakout.py",

    # API
    "$root/fastapi_app/api/__init__.py",
    "$root/fastapi_app/api/routes.py",
    "$root/fastapi_app/api/auth.py",
    "$root/fastapi_app/api/users.py",
    "$root/fastapi_app/api/accounts.py",
    "$root/fastapi_app/api/trades.py",
    "$root/fastapi_app/api/notifications.py",

    # Middleware
    "$root/fastapi_app/middleware/__init__.py",
    "$root/fastapi_app/middleware/auth.py",
    "$root/fastapi_app/middleware/logging.py",

    # Django core
    "$root/django_core/manage.py",
    "$root/django_core/admin.py",

    "$root/django_core/config/__init__.py",
    "$root/django_core/config/urls.py",
    "$root/django_core/config/asgi.py",
    "$root/django_core/config/wsgi.py",

    "$root/django_core/config/settings/__init__.py",
    "$root/django_core/config/settings/base.py",
    "$root/django_core/config/settings/dev.py",
    "$root/django_core/config/settings/prod.py",

    # Django apps (users)
    "$root/django_core/users/__init__.py",
    "$root/django_core/users/admin.py",
    "$root/django_core/users/apps.py",
    "$root/django_core/users/models.py",
    "$root/django_core/users/serializers.py",
    "$root/django_core/users/services.py",
    "$root/django_core/users/signals.py",

    # Accounts
    "$root/django_core/accounts/__init__.py",
    "$root/django_core/accounts/admin.py",
    "$root/django_core/accounts/apps.py",
    "$root/django_core/accounts/models.py",
    "$root/django_core/accounts/selectors.py",
    "$root/django_core/accounts/serializers.py",
    "$root/django_core/accounts/signals.py",

    # Trades
    "$root/django_core/trades/__init__.py",
    "$root/django_core/trades/models.py",
    "$root/django_core/trades/admin.py",
    "$root/django_core/trades/services.py",
    "$root/django_core/trades/selectors.py",
    "$root/django_core/trades/serializers.py",

    # Billing
    "$root/django_core/billing/__init__.py",
    "$root/django_core/billing/admin.py",
    "$root/django_core/billing/apps.py",
    "$root/django_core/billing/models.py",
    "$root/django_core/billing/services.py",
    "$root/django_core/billing/serializers.py",

    # Commission
    "$root/django_core/commission/__init__.py",
    "$root/django_core/commission/admin.py",
    "$root/django_core/commission/apps.py",
    "$root/django_core/commission/models.py",
    "$root/django_core/commission/services.py",
    "$root/django_core/commission/serializers.py",

    # Referrals
    "$root/django_core/referrals/__init__.py",
    "$root/django_core/referrals/admin.py",
    "$root/django_core/referrals/apps.py",
    "$root/django_core/referrals/models.py",
    "$root/django_core/referrals/services.py",
    "$root/django_core/referrals/serializers.py",

    # Notifications
    "$root/django_core/notifications/__init__.py",
    "$root/django_core/notifications/admin.py",
    "$root/django_core/notifications/apps.py",
    "$root/django_core/notifications/models.py",
    "$root/django_core/notifications/services.py",
    "$root/django_core/notifications/serializers.py",
    "$root/django_core/notifications/signals.py",

    # Audit
    "$root/django_core/audit/__init__.py",
    "$root/django_core/audit/admin.py",
    "$root/django_core/audit/apps.py",
    "$root/django_core/audit/models.py",
    "$root/django_core/audit/services.py",
    "$root/django_core/audit/serializers.py",
    "$root/django_core/audit/signals.py",

    # Shared
    "$root/shared/__init__.py",
    "$root/shared/database/__init__.py",
    "$root/shared/database/django.py",
    "$root/shared/settings/__init__.py",
    "$root/shared/settings/env.py",
    "$root/shared/utils/__init__.py",
    "$root/shared/utils/logger.py",
    "$root/shared/utils/time.py",
    "$root/shared/utils/ids.py",

    # Root files
    "$root/requirements/base.txt",
    "$root/requirements/dev.txt",
    "$root/requirements/prod.txt",
    "$root/.env",
    "$root/docker-compose.yml",
    "$root/README.md",
    "$root/Makefile"
)

Write-Host "Creating backend structure..."

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

foreach ($file in $files) {
    New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "Backend scaffold created successfully."
Write-Host "You are ready to build."

"""
URL configuration for Nexus Trading Bot.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    
    # App URLs (when ready)
    # path("api/v1/auth/", include("users.urls")),
    # path("api/v1/accounts/", include("accounts.urls")),
    # path("api/v1/trades/", include("trades.urls")),
    # path("api/v1/billing/", include("billing.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

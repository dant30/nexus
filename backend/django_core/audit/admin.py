from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "action", "created_at")
    list_filter = ("action",)
    search_fields = ("user__username", "description")
    readonly_fields = ("created_at",)

from .models import AuditLog


def list_audit_logs_for_user(user, limit=100):
    return AuditLog.objects.filter(user=user).order_by("-created_at")[:limit]

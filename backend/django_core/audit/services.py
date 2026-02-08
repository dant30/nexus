from .models import AuditLog


def create_audit_log(user=None, action: str = "", description: str = "", metadata: dict = None):
    metadata = metadata or {}
    al = AuditLog.objects.create(user=user, action=action, description=description, metadata=metadata)
    return al

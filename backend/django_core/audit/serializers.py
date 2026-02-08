from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ("id", "user", "action", "description", "metadata", "created_at")
        read_only_fields = ("id", "created_at")

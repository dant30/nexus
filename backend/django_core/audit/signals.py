from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django_core.trades.models import Trade

from .services import create_audit_log
from .models import AuditLog

User = get_user_model()


@receiver(post_save, sender=Trade)
def audit_trade_status(sender, instance: Trade, created, **kwargs):
    if created:
        create_audit_log(user=instance.user, action=AuditLog.ACTION_TRADE_CREATED, description=f"Trade {instance.id} created", metadata={"trade_id": instance.id})
    elif instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        create_audit_log(user=instance.user, action=AuditLog.ACTION_TRADE_CLOSED, description=f"Trade {instance.id} {instance.status}", metadata={"trade_id": instance.id, "status": instance.status})


from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django_core.trades.models import Trade
from .services import create_notification

User = get_user_model()


@receiver(post_save, sender=Trade)
def notify_on_trade_status_change(sender, instance: Trade, created, **kwargs):
    if instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        create_notification(
            user=instance.user,
            title=f"Trade {instance.status}",
            body=f"Your {instance.contract_type} trade ({instance.direction}) has {instance.status.lower()}.",
            level="info" if instance.status == Trade.STATUS_WON else "warning",
        )

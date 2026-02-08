from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Trade


@receiver(post_save, sender=Trade)
def trade_post_save(sender, instance: Trade, created, **kwargs):
    if created:
        # Hook for external systems: enqueue trade for execution, logging, or WS
        return
    # If status changed to a terminal state, we could emit notifications here
    if instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        # Placeholder: send notification or trigger accounting
        pass

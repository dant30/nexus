from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import apply_referral_commission

User = get_user_model()


@receiver(post_save, sender=User)
def apply_referral_on_fund(sender, instance, created, **kwargs):
    # This is a placeholder: a real implementation would trigger when a referred user makes
    # a qualifying action (e.g., first deposit). Keep this hook here to wire into billing.
    return

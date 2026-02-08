from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import register_referral

User = get_user_model()


@receiver(post_save, sender=User)
def assign_referral_if_present(sender, instance, created, **kwargs):
    # In a real flow, you'd inspect request/session for a referral code and call register_referral.
    # This placeholder leaves the hook for where referral registration should occur.
    return

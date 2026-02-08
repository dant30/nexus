from django.dispatch import receiver
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from .services import generate_affiliate_code

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_affiliate_code(sender, instance, created, **kwargs):
    if created and not instance.affiliate_code:
        instance.affiliate_code = generate_affiliate_code(instance.username)
        instance.save(update_fields=["affiliate_code"])

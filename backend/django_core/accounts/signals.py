from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth import get_user_model
from .services import create_demo_account

User = get_user_model()


@receiver(post_save, sender=User)
def create_default_demo_account(sender, instance, created, **kwargs):
    if created:
        # Create a demo account for every new user (default behavior)
        create_demo_account(instance)

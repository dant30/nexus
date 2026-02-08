from django.db import transaction
from .models import Notification


def create_notification(user=None, title: str = "", body: str = "", level: str = Notification.LEVEL_INFO, data: dict = None):
    """Create a new notification."""
    data = data or {}
    n = Notification.objects.create(user=user, title=title, body=body, level=level, data=data)
    return n


def mark_notification_as_read(notification):
    """Mark a single notification as read."""
    notification.is_read = True
    notification.save(update_fields=["is_read"])
    return notification


@transaction.atomic
def mark_all_as_read(user):
    """Mark all unread notifications for a user as read."""
    return Notification.objects.filter(user=user, is_read=False).update(is_read=True)


def delete_notification(notification):
    """Delete a notification."""
    notification.delete()


@transaction.atomic
def delete_all_notifications(user):
    """Delete all notifications for a user."""
    return Notification.objects.filter(user=user).delete()

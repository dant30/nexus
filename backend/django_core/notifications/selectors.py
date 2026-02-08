from .models import Notification


def get_unread_notifications(user, limit=100):
    """Get unread notifications for a user, newest first."""
    return Notification.objects.filter(user=user, is_read=False).order_by("-created_at")[:limit]


def get_all_notifications(user, limit=100):
    """Get all notifications for a user, newest first."""
    return Notification.objects.filter(user=user).order_by("-created_at")[:limit]


def get_notification_by_id(notification_id):
    """Get a specific notification by ID."""
    try:
        return Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        return None

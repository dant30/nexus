from .models import Trade


def get_user_trades(user, limit=100):
    return Trade.objects.filter(user=user).order_by("-created_at")[:limit]


def get_open_trades(user):
    return Trade.objects.filter(user=user, status=Trade.STATUS_OPEN).order_by("created_at")

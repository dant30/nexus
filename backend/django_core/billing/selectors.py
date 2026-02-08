from .models import Transaction


def get_user_transactions(user, limit=100):
    return Transaction.objects.filter(user=user).order_by("-created_at")[:limit]

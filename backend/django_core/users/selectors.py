from django.contrib.auth import get_user_model

User = get_user_model()


def get_user_by_email(email):
    try:
        return User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return None


def list_active_users(limit=100):
    return User.objects.filter(is_active=True).order_by("-created_at")[:limit]

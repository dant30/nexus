from .models import Account


def get_user_accounts(user):
    return Account.objects.filter(user=user).order_by("-is_default", "-created_at")


def get_default_account(user):
    try:
        return Account.objects.filter(user=user, is_default=True).first()
    except Account.DoesNotExist:
        return None
from .models import Account


def get_user_accounts(user):
    return Account.objects.filter(user=user).order_by("-is_default", "-created_at")


def get_default_account(user):
    return Account.objects.filter(user=user, is_default=True).first()

from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string

User = get_user_model()


def generate_affiliate_code(username: str) -> str:
    suffix = get_random_string(6).upper()
    base = (username or "u").replace("@", "_")[:24]
    return f"{base}-{suffix}"


def create_user_with_email(username: str, email: str, password: str = None, referred_by=None) -> User:
    user = User.objects.create_user(username=username, email=email, password=password)
    if referred_by:
        user.referred_by = referred_by
    if not user.affiliate_code:
        user.affiliate_code = generate_affiliate_code(username)
    user.save()
    return user

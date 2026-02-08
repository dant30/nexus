"""ID generation utilities."""
import uuid
from django.utils.crypto import get_random_string


def generate_ulid():
    """Generate a ULID-like string (UUID)."""
    return str(uuid.uuid4()).replace("-", "").upper()


def generate_proposal_id():
    """Generate a unique proposal ID for Deriv."""
    return f"PROP-{get_random_string(16).upper()}"


def generate_transaction_id():
    """Generate a unique transaction ID."""
    return f"TXN-{uuid.uuid4().hex.upper()[:20]}"


def generate_affiliate_code(base_username: str = ""):
    """Generate an affiliate/referral code."""
    prefix = (base_username or "REF")[:10].upper()
    suffix = get_random_string(8).upper()
    return f"{prefix}-{suffix}"

"""
OAuth integration module for Deriv.
Handles OAuth2 authorization flow and account linking.
"""

from .deriv_oauth import DerivOAuthClient
from .referral import ReferralEnforcer
from . import routes

__all__ = [
    "DerivOAuthClient",
    "ReferralEnforcer",
    "routes",
]

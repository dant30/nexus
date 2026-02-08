"""
Referral program enforcement for OAuth.
"""
from typing import Optional

from shared.utils.logger import log_info, get_logger

logger = get_logger("referral")


class ReferralEnforcer:
    """
    Enforce referral code usage during OAuth signup.
    """
    
    @staticmethod
    def validate_referral_code(code: str) -> Optional[int]:
        """
        Validate referral code and return referrer ID.
        
        Args:
        - code: Referral code from URL parameter
        
        Returns:
        - Referrer user ID or None if invalid
        """
        try:
            from django_core.referrals.models import ReferralCode
            
            referral_code = ReferralCode.objects.get(code=code)
            
            log_info(f"Referral code validated: {code}", owner=referral_code.owner.id)
            return referral_code.owner.id
        
        except Exception as e:
            log_info(f"Invalid referral code: {code}")
            return None
    
    @staticmethod
    def register_referral(referrer_id: int, new_user_id: int):
        """
        Register new user as referral of referrer.
        
        Args:
        - referrer_id: User ID of referrer
        - new_user_id: User ID of new user
        """
        try:
            from django_core.referrals.models import Referral, ReferralCode
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            # Get or create referral code
            code = ReferralCode.objects.get(owner_id=referrer_id)
            
            # Register referral
            Referral.objects.create(
                code=code,
                referred_user_id=new_user_id,
            )
            
            log_info(
                f"Referral registered",
                referrer=referrer_id,
                new_user=new_user_id,
            )
        
        except Exception as e:
            log_info(f"Failed to register referral: {str(e)}")

"""
User profile and settings routes.
"""
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from asgiref.sync import sync_to_async
from django.db import models

import django
django.setup()

from django.contrib.auth import get_user_model
from fastapi_app.deps import get_current_user, CurrentUser
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("users")
User = get_user_model()

router = APIRouter(tags=["Users"])


# ============================================================================
# Request/Response Models
# ============================================================================
class UserProfileResponse(BaseModel):
    """User profile response."""
    id: int
    username: str
    email: str
    is_staff: bool
    affiliate_code: Optional[str]
    markup_percentage: float
    created_at: Optional[str]


class UpdateProfileRequest(BaseModel):
    """Update user profile."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class AffiliateCodeResponse(BaseModel):
    """Affiliate code info."""
    code: str
    owner_id: int
    owner_username: str


# ============================================================================
# Endpoints
# ============================================================================
@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user's profile."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        return UserProfileResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_staff=user.is_staff,
            affiliate_code=getattr(user, "affiliate_code", None),
            markup_percentage=float(getattr(user, "markup_percentage", 0)),
            created_at=user.created_at.isoformat() if hasattr(user, "created_at") else None,
        )
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch user profile", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.patch("/profile")
async def update_user_profile(
    request: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update user profile."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        # Update allowed fields
        if request.email:
            user.email = request.email
        if request.first_name:
            user.first_name = request.first_name
        if request.last_name:
            user.last_name = request.last_name
        
        await sync_to_async(user.save)()
        
        log_info(f"User profile updated", user_id=user.id)
        
        return {
            "success": True,
            "message": "Profile updated",
            "user": UserProfileResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                is_staff=user.is_staff,
                affiliate_code=getattr(user, "affiliate_code", None),
                markup_percentage=float(getattr(user, "markup_percentage", 0)),
                created_at=user.created_at.isoformat() if hasattr(user, "created_at") else None,
            ),
        }
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to update profile", exception=e)
        raise HTTPException(status_code=500, detail="Update failed")


@router.get("/affiliate/code", response_model=AffiliateCodeResponse)
async def get_affiliate_code(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's affiliate code."""
    try:
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        affiliate_code = getattr(user, "affiliate_code", None)
        
        if not affiliate_code:
            raise HTTPException(status_code=404, detail="No affiliate code")
        
        return AffiliateCodeResponse(
            code=affiliate_code,
            owner_id=user.id,
            owner_username=user.username,
        )
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        log_error("Failed to fetch affiliate code", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/affiliate/stats")
async def get_affiliate_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's affiliate statistics."""
    try:
        from django_core.referrals.models import Referral, ReferralCode
        
        user = await sync_to_async(User.objects.get)(id=current_user.user_id)
        
        # Get referral codes owned by this user
        codes = await sync_to_async(list)(ReferralCode.objects.filter(owner=user))
        total_uses = sum(code.uses for code in codes)
        
        # Get referrals
        total_referrals = await sync_to_async(
            Referral.objects.filter(code__owner=user).count
        )()
        
        # Get commission earned
        from django_core.commission.models import CommissionTransaction
        commission_total = await sync_to_async(
            CommissionTransaction.objects.filter(owner=user).aggregate
        )(total=models.Sum("amount"))
        
        return {
            "affiliate_code": getattr(user, "affiliate_code", None),
            "referral_codes": len(codes),
            "total_uses": total_uses,
            "total_referrals": total_referrals,
            "commission_earned": float(commission_total.get("total") or 0),
        }
        
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch affiliate stats", exception=e)
        raise HTTPException(status_code=500, detail="Server error")

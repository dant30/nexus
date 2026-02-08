"""Notifications routes."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.notifications.models import Notification
from django_core.notifications.selectors import get_unread_notifications
from fastapi_app.deps import get_current_user, CurrentUser
from shared.utils.logger import log_error, get_logger

logger = get_logger("notifications")
User = get_user_model()

router = APIRouter(tags=["Notifications"])


class NotificationResponse(BaseModel):
    """Notification response."""
    id: int
    title: str
    body: str
    level: str
    is_read: bool
    created_at: str


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get notifications."""
    try:
        user = User.objects.get(id=current_user.user_id)
        
        if unread_only:
            notifications = get_unread_notifications(user, limit=limit)
        else:
            notifications = Notification.objects.filter(user=user).order_by("-created_at")[:limit]
        
        return [
            NotificationResponse(
                id=notif.id,
                title=notif.title,
                body=notif.body,
                level=notif.level,
                is_read=notif.is_read,
                created_at=notif.created_at.isoformat(),
            )
            for notif in notifications
        ]
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        log_error("Failed to fetch notifications", exception=e)
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark notification as read."""
    try:
        notification = Notification.objects.get(id=notification_id, user_id=current_user.user_id)
        notification.is_read = True
        notification.save()
        
        return {"success": True}
    except Notification.DoesNotExist:
        raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        log_error("Failed to mark notification", exception=e)
        raise HTTPException(status_code=500, detail="Server error")

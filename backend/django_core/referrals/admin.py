from django.contrib import admin
from .models import ReferralCode, Referral


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "owner", "uses", "created_at")
    search_fields = ("code", "owner__username")


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ("id", "referred_user", "code", "commission_awarded", "created_at")
    search_fields = ("referred_user__username", "code__code")

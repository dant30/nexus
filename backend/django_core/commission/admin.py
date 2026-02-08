from django.contrib import admin
from .models import CommissionRule, CommissionTransaction


@admin.register(CommissionRule)
class CommissionRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "referral_percent", "markup_percent", "created_at")
    search_fields = ("owner__username",)


@admin.register(CommissionTransaction)
class CommissionTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "commission_rule", "user", "amount", "created_at")
    search_fields = ("commission_rule__owner__username", "user__username")

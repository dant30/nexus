from django.contrib import admin
from .models import Account


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
	list_display = ("id", "user", "account_type", "deriv_account_id", "currency", "balance", "is_default", "created_at")
	search_fields = ("user__username", "deriv_account_id")
	list_filter = ("account_type", "currency", "is_default")
	readonly_fields = ("created_at", "updated_at")


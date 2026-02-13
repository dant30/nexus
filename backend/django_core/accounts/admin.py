from django.contrib import admin
from .models import Account


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "id", 
        "user", 
        "account_type", 
        "account_id",  # Changed from deriv_account_id to account_id
        "currency", 
        "balance", 
        "is_default", 
        "created_at"
    )
    search_fields = ("user__username", "account_id")  # Changed here too
    list_filter = ("account_type", "currency", "is_default")
    readonly_fields = ("created_at", "updated_at")
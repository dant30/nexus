from django.contrib import admin
from .models import Trade


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
	list_display = ("id", "user", "account", "contract_type", "direction", "stake", "payout", "status", "created_at")
	search_fields = ("user__username", "proposal_id", "transaction_id")
	list_filter = ("contract_type", "direction", "status")
	readonly_fields = ("created_at", "updated_at")


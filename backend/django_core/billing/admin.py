from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
	list_display = ("id", "user", "tx_type", "amount", "status", "created_at")
	search_fields = ("user__username", "reference")
	list_filter = ("tx_type", "status")


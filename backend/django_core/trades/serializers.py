from rest_framework import serializers
from .models import Trade


class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = (
            "id",
            "user",
            "account",
            "contract_type",
            "direction",
            "stake",
            "payout",
            "profit",
            "proposal_id",
            "transaction_id",
            "duration_seconds",
            "status",
            "commission_applied",
            "markup_applied",
            "created_at",
        )
        read_only_fields = ("id", "payout", "profit", "status", "commission_applied", "markup_applied", "created_at")

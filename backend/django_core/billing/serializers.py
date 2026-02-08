from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ("id", "user", "account", "tx_type", "amount", "status", "reference", "balance_after", "metadata", "created_at")
        read_only_fields = ("id", "created_at")

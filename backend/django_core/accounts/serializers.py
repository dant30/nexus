from rest_framework import serializers
from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ("id", "user", "deriv_account_id", "account_type", "currency", "balance", "metadata", "is_default", "markup_percentage", "created_at")
        read_only_fields = ("id", "balance", "created_at")

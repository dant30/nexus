from rest_framework import serializers
from .models import CommissionRule, CommissionTransaction


class CommissionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRule
        fields = ("id", "owner", "referral_percent", "markup_percent", "created_at")
        read_only_fields = ("id", "created_at")


class CommissionTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionTransaction
        fields = ("id", "commission_rule", "user", "amount", "reference", "metadata", "created_at")
        read_only_fields = ("id", "created_at")

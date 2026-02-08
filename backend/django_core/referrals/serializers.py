from rest_framework import serializers
from .models import ReferralCode, Referral


class ReferralCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralCode
        fields = ("id", "code", "owner", "uses", "metadata", "created_at")
        read_only_fields = ("id", "uses", "created_at")


class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = ("id", "code", "referred_user", "commission_awarded", "created_at")
        read_only_fields = ("id", "commission_awarded", "created_at")

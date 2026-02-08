from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_email_verified", "referred_by", "affiliate_code", "markup_percentage", "created_at")
        read_only_fields = ("id", "affiliate_code", "created_at")

from .models import CommissionRule, CommissionTransaction


def get_commission_rule_for(user):
    try:
        return CommissionRule.objects.get(owner=user)
    except CommissionRule.DoesNotExist:
        return None


def list_commission_transactions(owner_user, limit=100):
    return CommissionTransaction.objects.filter(commission_rule__owner=owner_user).order_by("-created_at")[:limit]

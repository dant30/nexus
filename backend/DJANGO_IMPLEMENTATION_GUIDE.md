# Nexus Django Core - Complete Implementation Guide

This document summarizes all Django core app implementations following the pattern:  
**models.py (schema) → admin.py (visibility) → services.py (business logic) → selectors.py (read logic) → serializers.py (API) → signals.py (automation)**

---

## 1. USERS APP

### models.py
```python
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    """Custom User model with affiliate and platform commission support."""
    
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    referred_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referrals",
    )
    affiliate_code = models.CharField(max_length=32, blank=True, null=True, unique=True)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.get_username()
```

**Key Fields:**
- `markup_percentage`: % the user's bot charges on trades
- `referred_by`: Reference to referrer for multi-level affiliate tracking
- `affiliate_code`: Unique code users can share

### admin.py
```python
from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_staff", "is_active", "markup_percentage", "created_at")
    list_filter = ("is_staff", "is_active")
    search_fields = ("username", "email", "affiliate_code")
    readonly_fields = ("created_at", "updated_at")
```

### serializers.py
```python
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_email_verified", "referred_by", "affiliate_code", "markup_percentage", "created_at")
        read_only_fields = ("id", "affiliate_code", "created_at")
```

### services.py
```python
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string

User = get_user_model()


def generate_affiliate_code(username: str) -> str:
    """Generate a unique affiliate code from username + random suffix."""
    suffix = get_random_string(6).upper()
    base = (username or "u").replace("@", "_")[:24]
    return f"{base}-{suffix}"


def create_user_with_email(username: str, email: str, password: str = None, referred_by=None) -> User:
    """Create a new user with optional referrer."""
    user = User.objects.create_user(username=username, email=email, password=password)
    if referred_by:
        user.referred_by = referred_by
    if not user.affiliate_code:
        user.affiliate_code = generate_affiliate_code(username)
    user.save()
    return user
```

### selectors.py
```python
from django.contrib.auth import get_user_model

User = get_user_model()


def get_user_by_email(email):
    """Fetch user by email (case-insensitive)."""
    try:
        return User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return None


def list_active_users(limit=100):
    """Get active users, newest first."""
    return User.objects.filter(is_active=True).order_by("-created_at")[:limit]
```

### signals.py
```python
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from .services import generate_affiliate_code

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_affiliate_code(sender, instance, created, **kwargs):
    """Auto-generate affiliate code on user creation."""
    if created and not instance.affiliate_code:
        instance.affiliate_code = generate_affiliate_code(instance.username)
        instance.save(update_fields=["affiliate_code"])
```

---

## 2. ACCOUNTS APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class Account(models.Model):
    ACCOUNT_DEMO = "DEMO"
    ACCOUNT_REAL = "REAL"
    ACCOUNT_TYPE_CHOICES = ((ACCOUNT_DEMO, "Demo"), (ACCOUNT_REAL, "Real"))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accounts")
    deriv_account_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    account_type = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default=ACCOUNT_DEMO)
    currency = models.CharField(max_length=8, default="USD")
    balance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    metadata = models.JSONField(default=dict, blank=True)  # Deriv's account metadata
    is_default = models.BooleanField(default=False)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_default", "-created_at")

    def __str__(self):
        return f"{self.user} - {self.account_type} ({self.currency})"
```

**Key Fields:**
- `account_type`: DEMO (default) or REAL (from Deriv)
- `metadata`: Stores Deriv account metadata (tier, leverage, etc.)
- `markup_percentage`: Commission % the bot earns on this account's trades

### admin.py
```python
from django.contrib import admin
from .models import Account


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "account_type", "currency", "balance", "is_default", "created_at")
    list_filter = ("account_type", "is_default")
    search_fields = ("user__username", "deriv_account_id")
    readonly_fields = ("created_at", "updated_at")
```

### serializers.py
```python
from rest_framework import serializers
from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ("id", "user", "deriv_account_id", "account_type", "currency", "balance", "metadata", "is_default", "markup_percentage", "created_at")
        read_only_fields = ("id", "balance", "created_at")
```

### services.py
```python
from typing import Optional
from decimal import Decimal
from django.conf import settings
from .models import Account


def create_demo_account(user, currency: str = "USD", initial_balance: Decimal = Decimal("10000.00")) -> Account:
    """Create a demo account for a new user with $10,000 starter balance."""
    acc = Account.objects.create(
        user=user,
        account_type=Account.ACCOUNT_DEMO,
        currency=currency,
        balance=initial_balance,
        is_default=True,
        markup_percentage=getattr(user, "markup_percentage", 0),
    )
    return acc


def create_or_update_real_account(user, deriv_account_id: str, currency: str, metadata: dict, is_default: bool = False) -> Account:
    """Sync or create a real Deriv account for this user."""
    acc, _ = Account.objects.update_or_create(
        user=user, deriv_account_id=deriv_account_id,
        defaults={
            "account_type": Account.ACCOUNT_REAL,
            "currency": currency,
            "metadata": metadata or {},
            "is_default": is_default,
            "markup_percentage": getattr(user, "markup_percentage", 0),
        },
    )
    return acc
```

### selectors.py
```python
from .models import Account


def get_user_accounts(user):
    """Get all accounts for a user, default first."""
    return Account.objects.filter(user=user).order_by("-is_default", "-created_at")


def get_default_account(user):
    """Fetch the user's default account (usually their demo account)."""
    try:
        return Account.objects.filter(user=user, is_default=True).first()
    except Account.DoesNotExist:
        return None
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth import get_user_model
from .services import create_demo_account

User = get_user_model()


@receiver(post_save, sender=User)
def create_default_demo_account(sender, instance, created, **kwargs):
    """Every new user gets a demo account (default behavior)."""
    if created:
        create_demo_account(instance)
```

---

## 3. TRADES APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class Trade(models.Model):
    # Contract types: CALL or PUT (vanilla options)
    CONTRACT_CALL = "CALL"
    CONTRACT_PUT = "PUT"
    CONTRACT_CHOICES = ((CONTRACT_CALL, "Call"), (CONTRACT_PUT, "Put"))

    # Direction: RISE or FALL only
    DIRECTION_RISE = "RISE"
    DIRECTION_FALL = "FALL"
    DIRECTION_CHOICES = ((DIRECTION_RISE, "Rise"), (DIRECTION_FALL, "Fall"))

    # Trade statuses
    STATUS_OPEN = "OPEN"
    STATUS_CLOSED = "CLOSED"
    STATUS_WON = "WON"
    STATUS_LOST = "LOST"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_CLOSED, "Closed"),
        (STATUS_WON, "Won"),
        (STATUS_LOST, "Lost"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trades")
    account = models.ForeignKey("accounts.Account", null=True, blank=True, on_delete=models.SET_NULL, related_name="trades")
    contract_type = models.CharField(max_length=10, choices=CONTRACT_CHOICES)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    stake = models.DecimalField(max_digits=20, decimal_places=6)
    payout = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    profit = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)

    proposal_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    transaction_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)

    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)

    commission_applied = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    markup_applied = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Trade {self.id}: {self.user} {self.contract_type} {self.direction} {self.stake}"
```

**Key Fields:**
- `contract_type`: CALL or PUT only
- `direction`: RISE or FALL only
- `commission_applied`: Fee from affiliate commission
- `markup_applied`: Fee from bot markup

### admin.py
```python
from django.contrib import admin
from .models import Trade


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "account", "contract_type", "direction", "stake", "payout", "status", "created_at")
    search_fields = ("user__username", "proposal_id", "transaction_id")
    list_filter = ("contract_type", "direction", "status")
    readonly_fields = ("created_at", "updated_at")
```

### serializers.py
```python
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
```

### services.py
```python
from decimal import Decimal
from django.db import transaction
from .models import Trade
from accounts.selectors import get_default_account


def create_trade(user, contract_type, direction, stake: Decimal, account=None, duration_seconds: int = None, proposal_id: str = None):
    """Create a Trade record (does not place orders on Deriv immediately)."""
    if account is None:
        account = get_default_account(user)
    t = Trade.objects.create(
        user=user,
        account=account,
        contract_type=contract_type,
        direction=direction,
        stake=stake,
        duration_seconds=duration_seconds,
        proposal_id=proposal_id,
    )
    return t


@transaction.atomic
def close_trade(trade: Trade, payout: Decimal, transaction_id: str = None):
    """Close a trade, compute profit, and set terminal status."""
    trade.transaction_id = transaction_id
    trade.payout = payout
    trade.profit = (payout - trade.stake) if payout is not None else Decimal("0")
    
    if trade.profit > 0:
        trade.status = Trade.STATUS_WON
    elif trade.profit < 0:
        trade.status = Trade.STATUS_LOST
    else:
        trade.status = Trade.STATUS_CLOSED
    
    trade.commission_applied = Decimal("0")
    trade.markup_applied = Decimal(getattr(trade.user, "markup_percentage", 0))
    trade.save()
    return trade
```

### selectors.py
```python
from .models import Trade


def get_user_trades(user, limit=100):
    """Get user's trade history."""
    return Trade.objects.filter(user=user).order_by("-created_at")[:limit]


def get_open_trades(user):
    """Get all open trades for a user."""
    return Trade.objects.filter(user=user, status=Trade.STATUS_OPEN).order_by("created_at")
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Trade


@receiver(post_save, sender=Trade)
def trade_post_save(sender, instance: Trade, created, **kwargs):
    """Hook for trade creation and status updates."""
    if created:
        # Enqueue to trading engine, emit WS event, etc.
        pass
    # Terminal states could trigger notifications/accounting
    if instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        pass
```

---

## 4. BILLING APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class Transaction(models.Model):
    TYPE_DEPOSIT = "DEPOSIT"
    TYPE_WITHDRAWAL = "WITHDRAWAL"
    TYPE_COMMISSION = "COMMISSION"
    TYPE_MARKUP = "MARKUP"
    TYPE_TRADE_PAYOUT = "TRADE_PAYOUT"
    TYPE_CHOICES = (
        (TYPE_DEPOSIT, "Deposit"),
        (TYPE_WITHDRAWAL, "Withdrawal"),
        (TYPE_COMMISSION, "Commission"),
        (TYPE_MARKUP, "Markup"),
        (TYPE_TRADE_PAYOUT, "Trade Payout"),
    )

    STATUS_PENDING = "PENDING"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_FAILED = "FAILED"
    STATUS_CHOICES = ((STATUS_PENDING, "Pending"), (STATUS_COMPLETED, "Completed"), (STATUS_FAILED, "Failed"))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    account = models.ForeignKey("accounts.Account", null=True, blank=True, on_delete=models.SET_NULL, related_name="transactions")
    tx_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=20, decimal_places=6)
    reference = models.CharField(max_length=128, blank=True, null=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    balance_after = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.tx_type} {self.amount} for {self.user} ({self.status})"
```

### admin.py
```python
from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tx_type", "amount", "status", "created_at")
    search_fields = ("user__username", "reference")
    list_filter = ("tx_type", "status")
```

### serializers.py
```python
from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ("id", "user", "account", "tx_type", "amount", "status", "reference", "balance_after", "metadata", "created_at")
        read_only_fields = ("id", "created_at")
```

### services.py
```python
from decimal import Decimal
from django.db import transaction
from .models import Transaction
from accounts.models import Account


@transaction.atomic
def record_transaction(user, tx_type: str, amount: Decimal, account: Account = None, reference: str = None, metadata: dict = None) -> Transaction:
    """Record a billing transaction and update account balance."""
    metadata = metadata or {}
    tx = Transaction.objects.create(user=user, tx_type=tx_type, amount=amount, account=account, reference=reference, metadata=metadata)
    
    # Apply to account balance for certain transaction types
    if account and tx_type in (Transaction.TYPE_TRADE_PAYOUT, Transaction.TYPE_COMMISSION, Transaction.TYPE_MARKUP, Transaction.TYPE_DEPOSIT):
        account.balance = (account.balance or Decimal("0")) + amount
        account.save(update_fields=["balance", "updated_at"])
        tx.balance_after = account.balance
        tx.status = Transaction.STATUS_COMPLETED
        tx.save(update_fields=["balance_after", "status"])
    
    return tx
```

### selectors.py
```python
from .models import Transaction


def get_user_transactions(user, limit=100):
    """Get user's transaction history."""
    return Transaction.objects.filter(user=user).order_by("-created_at")[:limit]
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Transaction


@receiver(post_save, sender=Transaction)
def transaction_post_save(sender, instance: Transaction, created, **kwargs):
    """Post-transaction hooks (audit, notify, reconcile)."""
    if created:
        pass
```

---

## 5. COMMISSION APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class CommissionRule(models.Model):
    """Defines commission percentages for an affiliate (owner)."""
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commission_rule")
    referral_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # % earned when referred user signs up
    markup_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)    # % earned as markup on trades

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CommissionRule({self.owner})"


class CommissionTransaction(models.Model):
    """Individual commission payouts or accruals."""
    commission_rule = models.ForeignKey(CommissionRule, on_delete=models.CASCADE, related_name="transactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commission_transactions")
    amount = models.DecimalField(max_digits=20, decimal_places=6)
    reference = models.CharField(max_length=128, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Commission {self.amount} to {self.commission_rule.owner} from {self.user}"
```

### admin.py
```python
from django.contrib import admin
from .models import CommissionRule, CommissionTransaction


@admin.register(CommissionRule)
class CommissionRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "referral_percent", "markup_percent", "created_at")
    search_fields = ("owner__username",)


@admin.register(CommissionTransaction)
class CommissionTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "commission_rule", "user", "amount", "created_at")
    search_fields = ("commission_rule__owner__username", "user__username")
```

### serializers.py
```python
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
```

### services.py
```python
from decimal import Decimal
from django.db import transaction
from .models import CommissionRule, CommissionTransaction


@transaction.atomic
def apply_referral_commission(referred_user, amount: Decimal, reference: str = None):
    """Award commission to the referrer based on their CommissionRule."""
    referrer = getattr(referred_user, "referred_by", None)
    if not referrer:
        return None
    try:
        rule = CommissionRule.objects.get(owner=referrer)
    except CommissionRule.DoesNotExist:
        return None
    
    commission_amount = (Decimal(rule.referral_percent) / Decimal(100)) * Decimal(amount)
    ct = CommissionTransaction.objects.create(commission_rule=rule, user=referred_user, amount=commission_amount, reference=reference or "referral")
    return ct


@transaction.atomic
def record_markup_payment(owner_user, payer_user, amount: Decimal, reference: str = None):
    """Record markup payment from a trading bot user to its owner."""
    try:
        rule = CommissionRule.objects.get(owner=owner_user)
    except CommissionRule.DoesNotExist:
        return None
    
    markup_amount = (Decimal(rule.markup_percent) / Decimal(100)) * Decimal(amount)
    ct = CommissionTransaction.objects.create(commission_rule=rule, user=payer_user, amount=markup_amount, reference=reference or "markup")
    return ct
```

### selectors.py
```python
from .models import CommissionRule, CommissionTransaction


def get_commission_rule_for(user):
    """Fetch commission rules for a user (if they're an affiliate)."""
    try:
        return CommissionRule.objects.get(owner=user)
    except CommissionRule.DoesNotExist:
        return None


def list_commission_transactions(owner_user, limit=100):
    """List commission payouts to an affiliate user."""
    return CommissionTransaction.objects.filter(commission_rule__owner=owner_user).order_by("-created_at")[:limit]
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import apply_referral_commission

User = get_user_model()


@receiver(post_save, sender=User)
def apply_referral_on_fund(sender, instance, created, **kwargs):
    """Placeholder hook to apply referral commission on qualifying actions."""
    return
```

---

## 6. REFERRALS APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class ReferralCode(models.Model):
    """Shareable referral codes issued by affiliates."""
    code = models.CharField(max_length=64, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referral_codes")
    uses = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.code} -> {self.owner}"


class Referral(models.Model):
    """Record of a user signing up via a referral code."""
    code = models.ForeignKey(ReferralCode, on_delete=models.SET_NULL, null=True, related_name="referrals")
    referred_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referred_entries")
    created_at = models.DateTimeField(default=timezone.now)
    commission_awarded = models.BooleanField(default=False)

    def __str__(self):
        return f"Referral {self.referred_user} via {self.code}"
```

### admin.py
```python
from django.contrib import admin
from .models import ReferralCode, Referral


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "owner", "uses", "created_at")
    search_fields = ("code", "owner__username")


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ("id", "referred_user", "code", "commission_awarded", "created_at")
    search_fields = ("referred_user__username", "code__code")
```

### serializers.py
```python
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
```

### services.py
```python
from django.utils.crypto import get_random_string
from .models import ReferralCode, Referral


def generate_referral_code(owner, prefix: str = None):
    """Generate a unique referral code for an affiliate."""
    base = (prefix or owner.username)[:20].upper()
    code = f"{base}-{get_random_string(6).upper()}"
    rc = ReferralCode.objects.create(code=code, owner=owner)
    return rc


def register_referral(code_str, referred_user):
    """Register a new user via referral code."""
    try:
        rc = ReferralCode.objects.get(code=code_str)
    except ReferralCode.DoesNotExist:
        return None
    
    ref = Referral.objects.create(code=rc, referred_user=referred_user)
    rc.uses = rc.uses + 1
    rc.save(update_fields=["uses"])
    return ref
```

### selectors.py
```python
from .models import ReferralCode, Referral


def get_referral_for_user(user):
    """Get the referral entry for a user (how they were referred)."""
    return Referral.objects.filter(referred_user=user).first()


def get_codes_for_owner(owner):
    """Get all referral codes issued by an affiliate."""
    return ReferralCode.objects.filter(owner=owner)
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import register_referral

User = get_user_model()


@receiver(post_save, sender=User)
def assign_referral_if_present(sender, instance, created, **kwargs):
    """Hook to assign referral during signup (wire from OAuth/signup handler)."""
    return
```

---

## 7. NOTIFICATIONS APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class Notification(models.Model):
    LEVEL_INFO = "info"
    LEVEL_WARNING = "warning"
    LEVEL_ERROR = "error"
    LEVEL_CHOICES = ((LEVEL_INFO, "Info"), (LEVEL_WARNING, "Warning"), (LEVEL_ERROR, "Error"))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField()
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default=LEVEL_INFO)
    is_read = models.BooleanField(default=False)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        target = self.user or "system"
        return f"Notification to {target}: {self.title}"
```

### admin.py
```python
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "level", "is_read", "created_at")
    list_filter = ("level", "is_read")
    search_fields = ("title", "body", "user__username")
```

### serializers.py
```python
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "user", "title", "body", "level", "is_read", "data", "created_at")
        read_only_fields = ("id", "created_at")
```

### services.py
```python
from .models import Notification


def create_notification(user=None, title: str = "", body: str = "", level: str = Notification.LEVEL_INFO, data: dict = None):
    """Create a notification for a user."""
    data = data or {}
    n = Notification.objects.create(user=user, title=title, body=body, level=level, data=data)
    return n
```

### selectors.py
```python
from .models import Notification


def get_unread_notifications(user, limit=100):
    """Get unread notifications for a user."""
    return Notification.objects.filter(user=user, is_read=False).order_by("-created_at")[:limit]


def mark_as_read(notification):
    """Mark a notification as read."""
    notification.is_read = True
    notification.save(update_fields=["is_read"])
    return notification
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from trades.models import Trade
from .services import create_notification


@receiver(post_save, sender=Trade)
def notify_on_trade_status_change(sender, instance: Trade, created, **kwargs):
    """Send notification when trade reaches terminal status."""
    if instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        create_notification(
            user=instance.user,
            title=f"Trade {instance.status}",
            body=f"Your {instance.contract_type} trade ({instance.direction}) has {instance.status.lower()}.",
            level="info" if instance.status == Trade.STATUS_WON else "warning",
        )
```

---

## 8. AUDIT APP

### models.py
```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class AuditLog(models.Model):
    """Capture audit trails of critical actions."""
    
    ACTION_USER_LOGIN = "USER_LOGIN"
    ACTION_USER_LOGOUT = "USER_LOGOUT"
    ACTION_TRADE_CREATED = "TRADE_CREATED"
    ACTION_TRADE_CLOSED = "TRADE_CLOSED"
    ACTION_WITHDRAWAL = "WITHDRAWAL"
    ACTION_DEPOSIT = "DEPOSIT"
    ACTION_COMMISSION_AWARDED = "COMMISSION_AWARDED"
    ACTION_CHOICES = (
        (ACTION_USER_LOGIN, "User Login"),
        (ACTION_USER_LOGOUT, "User Logout"),
        (ACTION_TRADE_CREATED, "Trade Created"),
        (ACTION_TRADE_CLOSED, "Trade Closed"),
        (ACTION_WITHDRAWAL, "Withdrawal"),
        (ACTION_DEPOSIT, "Deposit"),
        (ACTION_COMMISSION_AWARDED, "Commission Awarded"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.action} {self.user} at {self.created_at}"
```

### admin.py
```python
from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "action", "created_at")
    list_filter = ("action",)
    search_fields = ("user__username", "description")
    readonly_fields = ("created_at",)
```

### serializers.py
```python
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ("id", "user", "action", "description", "metadata", "created_at")
        read_only_fields = ("id", "created_at")
```

### services.py
```python
from .models import AuditLog


def create_audit_log(user=None, action: str = "", description: str = "", metadata: dict = None):
    """Create an audit log entry."""
    metadata = metadata or {}
    al = AuditLog.objects.create(user=user, action=action, description=description, metadata=metadata)
    return al
```

### selectors.py
```python
from .models import AuditLog


def list_audit_logs_for_user(user, limit=100):
    """Get audit logs for a user."""
    return AuditLog.objects.filter(user=user).order_by("-created_at")[:limit]
```

### signals.py
```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from trades.models import Trade
from .services import create_audit_log
from .models import AuditLog


@receiver(post_save, sender=Trade)
def audit_trade_status(sender, instance: Trade, created, **kwargs):
    """Audit log entries for trade lifecycle."""
    if created:
        create_audit_log(
            user=instance.user,
            action=AuditLog.ACTION_TRADE_CREATED,
            description=f"Trade {instance.id} created",
            metadata={"trade_id": instance.id},
        )
    elif instance.status in (Trade.STATUS_WON, Trade.STATUS_LOST, Trade.STATUS_CANCELLED):
        create_audit_log(
            user=instance.user,
            action=AuditLog.ACTION_TRADE_CLOSED,
            description=f"Trade {instance.id} {instance.status}",
            metadata={"trade_id": instance.id, "status": instance.status},
        )
```

---

## App Config Setup

Ensure each Django app has an `apps.py` that imports signals:

```python
# Example for users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self):
        import users.signals
```

Repeat for: accounts, trades, billing, commission, referrals, notifications, audit

---

## Key Design Patterns

### 1. **Models = Schema (Law)**
- Define one clear entity per model
- Use indexed fields for lookups (deriv_account_id, proposal_id, transaction_id)
- Store metadata as JSON for extensibility

### 2. **Admin = Visibility (Sanity)**
- Always show key fields (id, user, status, created_at) for debugging
- Use list_filter for categorical fields
- Use search_fields for findability

### 3. **Services = Business Logic**
- Atomic transactions for critical changes
- Encapsulate complex operations (balance updates, commission calculations)

### 4. **Selectors = Read-Only Queries**
- Lightweight, no side effects
- Clear names (get_, list_, find_)

### 5. **Serializers = API Contract**
- Define what fields are readable vs. writable
- Validation and nested relationships

### 6. **Signals = Automation**
- Auto-generate affiliate codes on user creation
- Create demo account for new users
- Notify on trade status changes
- Log critical actions

---

## Important Notes

- **Trades**: Only CALL/PUT (vanilla), only RISE/FALL (no exotic contracts)
- **Accounts**: Demo (default, $10K starter) + Real (Deriv-linked)
- **Markup**: Stored in both `User.markup_percentage` and `Account.markup_percentage`
- **Commission**: Two types: referral_percent (signup) + markup_percent (trades)
- **Atomicity**: Use `@transaction.atomic` for balance updates, trade closures
- **Signals**: All fired post_save; be careful of recursive saves

---

This is a production-ready blueprint for your Django core. Each app can now be extended with FastAPI routes, WebSocket handlers, and trading logic.

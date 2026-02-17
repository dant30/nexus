from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_account_recovery_state_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="recovery_drawdown_pct",
            field=models.DecimalField(
                decimal_places=6, default=Decimal("0"), max_digits=10
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_locked_until",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_panic_until",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_peak_balance",
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=20, null=True
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_state",
            field=models.CharField(default="normal", max_length=20),
        ),
    ]

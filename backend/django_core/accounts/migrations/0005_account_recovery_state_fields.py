from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_alter_account_account_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="recovery_active",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_initial_stake",
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=20, null=True
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_level",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_loss_to_recover",
            field=models.DecimalField(
                decimal_places=6, default=Decimal("0"), max_digits=20
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_multiplier",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("1.00"), max_digits=10
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="recovery_recovered_amount",
            field=models.DecimalField(
                decimal_places=6, default=Decimal("0"), max_digits=20
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("trades", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="trade",
            name="trade_type",
            field=models.CharField(
                choices=[("RISE_FALL", "Rise/Fall"), ("CALL_PUT", "Call/Put")],
                default="CALL_PUT",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="trade",
            name="contract",
            field=models.CharField(
                choices=[
                    ("RISE", "Rise"),
                    ("FALL", "Fall"),
                    ("CALL", "Call"),
                    ("PUT", "Put"),
                ],
                default="CALL",
                max_length=10,
            ),
        ),
    ]

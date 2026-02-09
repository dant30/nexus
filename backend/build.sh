#!/usr/bin/env bash
set -euo pipefail

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements/prod.txt

# Run Django migrations for ORM-backed models
python django_core/manage.py migrate --noinput

# Optional: collect static (safe to skip if not using Django static files)
# python django_core/manage.py collectstatic --noinput
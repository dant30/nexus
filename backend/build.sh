#!/usr/bin/env bash
# Exit immediately on errors, undefined vars, or pipe failures
set -euo pipefail

# Optional: Print commands as they run (for debugging)
# set -x

# ---- CONFIG ----
PROJECT_DIR="django_core"
REQUIREMENTS_FILE="requirements/prod.txt"
COLLECT_STATIC=${COLLECT_STATIC:-false}
ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}
ADMIN_RESET_PASSWORD_ON_BUILD=${ADMIN_RESET_PASSWORD_ON_BUILD:-false}

# ---- FUNCTIONS ----
log() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

# ---- SCRIPT START ----
log "Upgrading pip..."
python -m pip install --upgrade pip

log "Installing dependencies from $REQUIREMENTS_FILE..."
python -m pip install -r "$REQUIREMENTS_FILE"

log "Running Django migrations..."
python "$PROJECT_DIR/manage.py" migrate --noinput

if [ -n "$ADMIN_EMAIL" ]; then
    log "Checking admin account for $ADMIN_EMAIL..."
    python "$PROJECT_DIR/manage.py" shell <<'PY'
import os
import sys
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
username = os.environ.get("ADMIN_USERNAME", "admin").strip() or "admin"
password = os.environ.get("ADMIN_PASSWORD", "")
reset_password = os.environ.get("ADMIN_RESET_PASSWORD_ON_BUILD", "false").strip().lower() == "true"

if not email:
    print("SKIP: ADMIN_EMAIL not provided")
    raise SystemExit(0)

user = User.objects.filter(email=email).first()
created = False
promoted = False
password_reset = False

if user is None:
    if not password:
        print("ERROR: admin user not found and ADMIN_PASSWORD is empty")
        raise SystemExit(1)

    candidate = username
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{username}{suffix}"

    user = User.objects.create_superuser(
        username=candidate,
        email=email,
        password=password,
    )
    created = True
else:
    if not user.is_staff or not user.is_superuser:
        user.is_staff = True
        user.is_superuser = True
        promoted = True
    if reset_password and password:
        user.set_password(password)
        password_reset = True
    if promoted or password_reset:
        user.save()

state = "created" if created else "existing"
print(
    f"OK: admin {state} id={user.id} email={email} "
    f"is_staff={user.is_staff} is_superuser={user.is_superuser} "
    f"promoted={promoted} password_reset={password_reset}"
)
PY
else
    log "Skipping admin check (ADMIN_EMAIL not set)"
fi

if [ "$COLLECT_STATIC" = true ]; then
    log "Collecting static files..."
    python "$PROJECT_DIR/manage.py" collectstatic --noinput
else
    log "Skipping static files collection"
fi

log "Deployment steps completed successfully"

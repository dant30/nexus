#!/usr/bin/env bash
# Exit immediately on errors, undefined vars, or pipe failures
set -euo pipefail

# Optional: Print commands as they run (for debugging)
# set -x

# ---- CONFIG ----
PROJECT_DIR="django_core"
REQUIREMENTS_FILE="requirements/prod.txt"
COLLECT_STATIC=${COLLECT_STATIC:-false}  # Set to true if you want to collect static files

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

if [ "$COLLECT_STATIC" = true ]; then
    log "Collecting static files..."
    python "$PROJECT_DIR/manage.py" collectstatic --noinput
else
    log "Skipping static files collection"
fi

log "Deployment steps completed successfully ✅"

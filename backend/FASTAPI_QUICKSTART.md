# FastAPI Backend - Quick Start Guide 🚀

## Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Redis 5.0+
- Virtual environment

---

## Step 1: Setup Python Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

---

## Step 2: Install Dependencies

```bash
# Install all requirements (Django + FastAPI)
pip install -r requirements/base.txt

# For development (includes testing tools):
pip install -r requirements/dev.txt

# For production:
# pip install -r requirements/prod.txt
```

---

## Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# At minimum, set:
# - SECRET_KEY (any random string)
# - DATABASE_URL (PostgreSQL connection)
# - DERIV_APP_ID, DERIV_API_KEY (from Deriv)
```

### For Development (quick setup):
```bash
# Create .env with minimal settings
cat > .env << EOF
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=dev-secret-key-12345
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexus_db
REDIS_URL=redis://localhost:6379/0
DERIV_APP_ID=test-app-id
DERIV_API_KEY=test-api-key
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
```

---

## Step 4: Setup Database

```bash
# Apply Django migrations
python django_core/manage.py migrate

# Create superuser for admin
python django_core/manage.py createsuperuser
# Username: admin
# Email: admin@example.com
# Password: (choose one)

# Create required database records (if any)
python django_core/manage.py shell
```

In Django shell:
```python
from django_core.users.models import User

# Create test user (optional)
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={'email': 'test@example.com'}
)
if created:
    user.set_password('testpass123')
    user.save()

print(f"User: {user.username}, ID: {user.id}")
exit()
```

---

## Step 5: Start Services

### In separate terminals:

**Terminal 1: PostgreSQL**
```bash
# Make sure PostgreSQL is running
# Linux/Mac:
pg_ctl start -D /usr/local/var/postgres
# Docker:
docker run -d -p 5432:5432 --name postgres \
  -e POSTGRES_DB=nexus_db \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

**Terminal 2: Redis**
```bash
# Make sure Redis is running
# Linux/Mac:
redis-server
# Docker:
docker run -d -p 6379:6379 --name redis redis:7
```

**Terminal 3: FastAPI Server**
```bash
# From backend directory
python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000

# Or with custom settings:
python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
```

---

## Step 6: Test the API

### Health Check
```bash
curl http://localhost:8000/health
# Returns: {"status": "healthy", "service": "nexus-trading-api", ...}
```

### API Documentation
Open in browser:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Login Example
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'

# Returns:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer",
#   "expires_in": 3600,
#   "user": {
#     "id": 1,
#     "username": "testuser",
#     "email": "test@example.com"
#   }
# }
```

### Get User Profile (with auth)
```bash
# Use access_token from login response
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Step 7: Create Trading Account (via API)

```bash
# Create demo account
curl -X POST http://localhost:8000/api/v1/accounts/demo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "initial_balance": "5000.00"
  }'

# List accounts
curl -X GET http://localhost:8000/api/v1/accounts/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Step 8: Execute a Trade (via API)

```bash
# Execute trade
curl -X POST http://localhost:8000/api/v1/trades/execute \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_type": "CALL",
    "direction": "RISE",
    "stake": "1.00",
    "account_id": 1,
    "duration_seconds": 60
  }'

# Get trade history
curl -X GET http://localhost:8000/api/v1/trades/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Common Commands

### Reset Database
```bash
# Remove all Django data (WARNING: deletes everything)
python django_core/manage.py flush --noinput

# Reapply migrations
python django_core/manage.py migrate
```

### Clear Django Cache
```bash
python django_core/manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

### Check PyJWT Installation
```bash
python -c "import jwt; print(jwt.__version__)"
```

### Test WebSocket Connection
```bash
# Using websocat or similar tool:
websocat ws://localhost:8000/ws/trading/1/1

# Send subscription:
# {"type": "subscribe", "symbol": "EURUSD"}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL
psql -U postgres -c "SELECT version();"

# Check connection string in .env
echo $DATABASE_URL
```

### Redis Connection Error
```bash
# Check Redis
redis-cli ping
# Should return: PONG
```

### Module Not Found
```bash
# Reinstall requirements
pip install -r requirements/base.txt --force-reinstall
```

### JWT Import Error
```bash
# Make sure PyJWT is installed
pip install PyJWT cryptography python-jose
```

---

## Development Workflow

### Make Code Changes
1. Edit files in `fastapi_app/`
2. Server auto-reloads on save (with `--reload` flag)
3. Test changes immediately

### Add New Endpoint
1. Create route in appropriate file: `api/xxx.py`
2. Import router in `api/__init__.py`
3. Include in `main.py`
4. Test via http://localhost:8000/api/docs

### Database Model Changes
1. Edit model in `django_core/xxx/models.py`
2. Create migration: `python django_core/manage.py makemigrations`
3. Apply migration: `python django_core/manage.py migrate`

---

## Production Deployment

### Build Docker Image
```bash
docker build -f Dockerfile -t nexus-trading-api:latest .

docker run -d \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e DATABASE_URL=... \
  --name nexus-api \
  nexus-trading-api:latest
```

### Deploy with Gunicorn
```bash
# Install production server
pip install gunicorn

# Run with 4 workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  fastapi_app.main:app
```

### Setup Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.nexus.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Next: Frontend Integration

Once backend is running, connect frontend to:
- **API Base URL**: `http://localhost:8000/api/v1`
- **WebSocket URL**: `ws://localhost:8000/ws`
- **Docs URL**: `http://localhost:8000/api/docs`

---

**Status**: ✅ READY FOR LOCAL DEVELOPMENT & PRODUCTION DEPLOYMENT

# Quick Start Guide - Nexus Trading Platform

Get the Nexus trading platform running locally in 15 minutes.

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **PostgreSQL** 12+ (database)
- **Redis** 5.0+ (cache)
- **Docker** & **Docker Compose** (optional but recommended)

## 🚀 Quick Start (Docker - Recommended)

### 1. Clone & Setup
```bash
cd nexus
```

### 2. Create Environment Files

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env  # If it exists in future
```

Create `backend/.env`:
```env
# Django
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/nexus_db

# Redis
REDIS_URL=redis://redis:6379/0

# Deriv API
DERIV_API_KEY=your_deriv_api_key
DERIV_API_SECRET=your_deriv_api_secret
DERIV_OAUTH_APP_ID=your_app_id
DERIV_OAUTH_REDIRECT_URI=http://localhost:5173/oauth/callback

# JWT
JWT_SECRET=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**Frontend** (`frontend/.env`):
```bash
cd ../frontend
cp .env.example .env
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_DERIV_APP_ID=your_deriv_app_id
VITE_DERIV_REDIRECT_URL=http://localhost:5173/oauth/callback
VITE_ENVIRONMENT=development
VITE_DEBUG=true
```

### 3. Start with Docker Compose

```bash
cd nexus  # Root directory

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services will be available at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 🛠️ Manual Setup (Without Docker)

### Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements/dev.txt

# 3. Create .env file (see above)

# 4. Run migrations
python django_core/manage.py migrate

# 5. Create superuser (optional)
python django_core/manage.py createsuperuser

# 6. Start FastAPI server
python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000

### Frontend Setup (in new terminal)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env file (see above)

# 3. Start dev server
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## 🧪 Testing the Platform

### 1. Access the Frontend
```
http://localhost:5173
```

You'll see the login page.

### 2. Test Login/Signup

**Option A: Email/Password**
- Click "Sign Up"
- Enter username, email, password
- Optionally enter referral code: `dangote_fx`
- A demo account with $10K is auto-created

**Option B: Deriv OAuth**
- Click "Continue with Deriv"
- You'll be redirected to Deriv authorization page
- Log in with your Deriv account (or register)
- You'll be redirected back to Nexus dashboard

### 3. Dashboard
After login, you'll see:
- Account balance and equity
- Open trades count
- Win rate statistics
- List of accounts (Demo/Real)
- Open trades table

### 4. Execute a Trade
- Click "New Trade" or navigate to `/trade`
- Select account and symbol (EURUSD, GOLD, etc.)
- Choose CALL (up) or PUT (down)
- Enter stake amount ($0.35 - $1,000)
- Select expiry time (1, 5, 15, 30, 60 minutes)
- Click "Execute Trade"

### 5. Real-Time Updates
- The WebSocket connection shows "Connected" in header
- Price updates appear in real-time
- Trade status updates appear automatically

---

## 📊 Database Setup

### First Time Setup

**If using Docker:**
```bash
# Migrations run automatically

# Create test data (optional)
docker-compose exec backend python django_core/manage.py shell
```

**If using local Python:**
```bash
python django_core/manage.py migrate

# Optional: load initial data
python django_core/manage.py loaddata fixtures/initial.json
```

### Access Database Directly

**PostgreSQL:**
```bash
# Docker
docker-compose exec db psql -U postgres -d nexus_db

# Local
psql -U postgres -h localhost -d nexus_db
```

**Redis:**
```bash
# Docker
docker-compose exec redis redis-cli

# Local
redis-cli
```

---

## 🔑 Environment Variables Explained

### Backend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET_KEY` | ✅ | Django secret key (generate one) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection URL |
| `DERIV_OAUTH_APP_ID` | ✅ | Deriv OAuth app ID |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `DEBUG` | Optional | Debug mode (True/False) |
| `ALLOWED_HOSTS` | Optional | Allowed domains |

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL |
| `VITE_WS_URL` | ✅ | WebSocket URL |
| `VITE_DERIV_APP_ID` | ✅ | Deriv OAuth app ID |
| `VITE_ENVIRONMENT` | Optional | development/production |

---

## 🐛 Troubleshooting

### Frontend won't connect to backend
```
Error: CORS policy blocked request
```
**Solution:**
1. Check `VITE_API_URL` in frontend `.env`
2. Check `ALLOWED_HOSTS` in backend `.env`
3. Check CORS settings in `fastapi_app/main.py`

### WebSocket connection failing
```
Error: WebSocket connection failed
```
**Solution:**
1. Check `VITE_WS_URL` in frontend `.env`
2. Verify backend is running: `curl http://localhost:8000/api/v1/health`
3. Check firewall settings
4. Look at backend logs: `docker-compose logs fastapi`

### Database connection error
```
Error: could not connect to server
```
**Solution:**
1. Verify PostgreSQL is running
2. Check `DATABASE_URL` format
3. Verify database exists: `psql -l`
4. Create database if needed: `createdb nexus_db`

### OAuth errors
```
Error: Invalid app_id
```
**Solution:**
1. Verify `DERIV_OAUTH_APP_ID` is correct
2. Check Deriv app settings in your Deriv account
3. Verify redirect URI matches between Deriv and frontend

### Migrations fail
```
Error: django.db.utils.ProgrammingError
```
**Solution:**
```bash
# Reset database (dev only)
python manage.py migrate zero django_core
python manage.py migrate
```

---

## 📝 Useful Commands

### Backend Commands

```bash
# Start server
python -m uvicorn fastapi_app.main:app --reload

# Run migrations
python django_core/manage.py migrate

# Create superuser
python django_core/manage.py createsuperuser

# Run tests
python -m pytest

# Start Celery worker
celery -A fastapi_app.tasks worker -l info
```

### Frontend Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Execute command in container
docker-compose exec backend bash
docker-compose exec frontend sh

# Rebuild images
docker-compose build --no-cache
```

---

## 🔍 API Testing

### Manual API Testing with cURL

**Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "affiliate_code": "john_doe_123"
  }
}
```

**Get Accounts (using token):**
```bash
curl http://localhost:8000/api/v1/accounts \
  -H "Authorization: Bearer <access_token>"
```

**Execute Trade:**
```bash
curl -X POST http://localhost:8000/api/v1/trades/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "account_id": 1,
    "symbol": "EURUSD",
    "trade_type": "CALL",
    "stake": 10,
    "expiry_minutes": 5
  }'
```

---

## 📚 Documentation

For more detailed documentation:

1. **Backend Setup**: `backend/README.md`
2. **Backend API Reference**: `backend/FASTAPI_GUIDE.md`
3. **Frontend Setup**: `frontend/FRONTEND_SETUP_GUIDE.md`
4. **Project Overview**: `PROJECT_SUMMARY.md`
5. **File Inventory**: `backend/FILE_INVENTORY.md`, `frontend/FRONTEND_FILE_INVENTORY.md`

---

## ✅ Checklist - First Time Setup

- [ ] Clone the repository
- [ ] Install Node.js 18+
- [ ] Install Python 3.10+
- [ ] Install PostgreSQL & Redis (or use Docker)
- [ ] Create backend `.env` file
- [ ] Create frontend `.env` file
- [ ] Start Docker Compose (or run manually)
- [ ] Verify backend is running: http://localhost:8000
- [ ] Verify frontend is running: http://localhost:5173
- [ ] Test login with email/password
- [ ] Test Deriv OAuth flow
- [ ] Execute a test trade
- [ ] Check WebSocket connection
- [ ] Verify database has data

---

## 🎉 You're Ready!

Your Nexus trading platform is ready to use. 

**Next Steps:**
1. Explore the dashboard
2. Execute a test trade
3. Check the admin panel: http://localhost:8000/admin
4. Read the full documentation
5. Customize for your needs

**For Production Deployment:**
See `PROJECT_SUMMARY.md` - Deployment Checklist section

---

## 💬 Support

If you encounter any issues:
1. Check the Troubleshooting section above
2. Review the documentation files
3. Check Docker/service logs
4. Verify environment variables
5. Test API manually with curl

**Happy Trading! 🚀**

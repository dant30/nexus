# Nexus Trading Platform - Troubleshooting Guide

## Common Issues & Solutions

### 1. Frontend Can't Connect to Backend

**Error**: `CORS policy blocked request` or `Failed to fetch`

**Solutions**:
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings
# In backend/.env, verify:
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Check frontend environment
# In frontend/.env, verify:
VITE_API_URL=http://localhost:8000/api/v1

# Restart services
docker-compose down
docker-compose up -d
```

---

### 2. Authentication Token Expiration

**Error**: `401 Unauthorized` after some time

**Solution**:
The API client automatically refreshes tokens. If still getting 401:

```bash
# Check token refresh endpoint works
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'

# Check AuthStorage in frontend
# Verify tokens are saved in localStorage
```

---

### 3. WebSocket Connection Fails

**Error**: `WebSocket connection failed` or `ws://localhost:8000/ws 404`

**Solutions**:
```bash
# Check WebSocket URL in frontend
VITE_WS_URL=ws://localhost:8000/ws

# Verify backend WebSocket endpoint exists
curl http://localhost:8000/ws/test

# Check logs
docker-compose logs backend | grep -i websocket

# Ensure WebSocket is not blocked by firewall
sudo ufw allow 8000/tcp
```

---

### 4. Database Connection Error

**Error**: `could not connect to server` or `PostgreSQL connection failed`

**Solutions**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify DATABASE_URL
grep DATABASE_URL backend/.env

# Check database credentials
docker-compose exec postgres psql -U postgres -c "\l"

# Reset database
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d
docker-compose exec backend python django_core/manage.py migrate
```

---

### 5. Static Files Not Loading

**Error**: 404 on `/static/` paths or CSS not applying

**Solutions**:
```bash
# Collect static files
docker-compose exec backend python django_core/manage.py collectstatic --no-input

# Check permissions
docker-compose exec backend ls -la staticfiles/

# Clear browser cache (Ctrl+Shift+R)

# In production, ensure nginx serves static files correctly
# Check nginx.prod.conf location /static/ block
```

---

### 6. Migrations Not Applying

**Error**: `Migration 0001_initial not applied` or migration errors

**Solutions**:
```bash
# Check migration status
docker-compose exec backend python django_core/manage.py showmigrations

# Apply migrations manually
docker-compose exec backend python django_core/manage.py migrate accounts

# Reset migrations (WARNING: Deletes data)
docker-compose exec backend python django_core/manage.py migrate accounts zero

# Recreate migrations
docker-compose exec backend python django_core/manage.py makemigrations
docker-compose exec backend python django_core/manage.py migrate
```

---

### 7. OAuth Not Working

**Error**: `Failed to initiate OAuth flow` or `Invalid app ID`

**Solutions**:
```bash
# Verify Deriv credentials
grep DERIV_APP_ID backend/.env
grep DERIV_API_KEY backend/.env

# Check OAuth redirect URL
DERIV_OAUTH_CALLBACK_URL=http://localhost:5173/oauth/callback

# Verify in Deriv dashboard (https://app.deriv.com/account/api-token):
# - App ID is enabled
# - Scopes include "read" and "write"
# - Redirect URL is whitelisted

# Test OAuth endpoint
curl http://localhost:8000/api/v1/oauth/deriv/authorize
```

---

### 8. Out of Memory

**Error**: `Killed` (exit code 137) or `OOMKilled`

**Solutions**:
```bash
# Check memory usage
docker stats

# Increase container memory limit
# Edit docker-compose.yml:
services:
  backend:
    mem_limit: 2g
  frontend:
    mem_limit: 1g

# Restart
docker-compose down
docker-compose up -d

# Or increase system swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

### 9. Slow API Responses

**Error**: Requests taking > 5 seconds

**Solutions**:
```bash
# Check backend logs for slow queries
docker-compose logs backend | grep -i "slow"

# Check database performance
docker-compose exec postgres psql -U postgres -d nexus_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Enable query logging
# In backend settings:
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {...},
        'file': {'filename': 'queries.log'},
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['file'],
            'level': 'DEBUG',
        },
    },
}

# Check for N+1 queries
# Check network tab in browser DevTools

# Check Redis cache
docker-compose exec redis redis-cli
redis> KEYS *
redis> FLUSHDB  # Clear cache if corrupted
```

---

### 10. Email Not Sending

**Error**: Email verification failing or notification emails not sent

**Solutions**:
```bash
# Check email backend setting
grep EMAIL_BACKEND backend/.env

# For development:
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# For production (Gmail example):
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Check logs
docker-compose logs backend | grep -i "email"

# Test email
docker-compose exec backend python django_core/manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'This is a test', 'from@example.com', ['to@example.com'])
```

---

### 11. Docker Build Fails

**Error**: `Error building image` or `requirements not found`

**Solutions**:
```bash
# Clean build cache
docker-compose build --no-cache

# Check Dockerfile exists
ls backend/Dockerfile
ls frontend/Dockerfile

# Check context path
docker build -f backend/Dockerfile -t backend:latest backend/

# View full error
docker-compose build --progress=plain
```

---

### 12. Port Already in Use

**Error**: `Address already in use` or `port 8000 already allocated`

**Solutions**:
```bash
# Find process using port
lsof -i :8000
netstat -tulpn | grep 8000

# Kill process
kill -9 <PID>

# Or use different port
# In docker-compose.yml:
ports:
  - "8001:8000"  # Map 8001 -> 8000
  
# Update frontend .env
VITE_API_URL=http://localhost:8001/api/v1
```

---

### 13. SSL Certificate Issues (Production)

**Error**: `NET::ERR_CERT_INVALID` or certificate errors

**Solutions**:
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/nexus.com/fullchain.pem -text -noout

# Renew certificate
sudo certbot renew --force-renewal

# Check nginx SSL config
grep ssl_certificate /etc/nginx/nginx.conf

# Test SSL
curl -I https://nexus.com

# Check certificate expiry
echo | openssl s_client -connect nexus.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

### 14. High CPU Usage

**Error**: CPU at 100% or services running slow

**Solutions**:
```bash
# Identify which service
docker stats

# Check for infinite loops
docker-compose logs backend --tail=100 | grep -i error

# Check for memory leaks
docker-compose exec backend python -m memory_profiler

# Reduce worker threads
# In backend settings:
WORKERS=2  # Default: 4

# Restart services
docker-compose restart backend
```

---

### 15. Permission Denied Errors

**Error**: `Permission denied` on files or directories

**Solutions**:
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/nexus

# Fix permissions
sudo chmod -R 755 /var/www/nexus
sudo chmod -R 644 /var/www/nexus/*.*
sudo chmod -R 755 /var/www/nexus/*/

# Or use Docker:
docker-compose exec backend chown -R 1000:1000 /app
docker-compose exec frontend chown -R 1000:1000 /app
```

---

## Logging & Debugging

### View Logs
```bash
# Backend logs
docker-compose logs -f backend --tail=50

# Frontend logs
docker-compose logs -f frontend --tail=50

# Database logs
docker-compose logs -f postgres --tail=50

# All logs
docker-compose logs -f
```

### Enable Debug Mode

```bash
# In backend/.env
DEBUG=True
LOG_LEVEL=DEBUG

# Restart
docker-compose restart backend
```

### Django Shell
```bash
# Access Django shell
docker-compose exec backend python django_core/manage.py shell

# Query database
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> User.objects.all().count()

>>> from django_core.accounts.models import Account
>>> Account.objects.filter(user__username='testuser')
```

---

## Performance Profiling

### Profile Requests
```bash
# Add Django Debug Toolbar (development only)
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

# Set INTERNAL_IPS
INTERNAL_IPS = ['127.0.0.1']
```

###  Profile Database Queries
```bash
docker-compose exec backend python django_core/manage.py shell
>>> from django.db import connection
>>> connection.queries_log
>>> print(len(connection.queries))
```

---

## Emergency Commands

```bash
# Hard reset everything
docker-compose down -v
docker system prune -a -f
docker-compose up -d
docker-compose exec backend python django_core/manage.py migrate
docker-compose exec backend python django_core/manage.py createsuperuser

# Backup everything
docker-compose exec postgres pg_dump -U postgres nexus_db > emergency_backup.sql
tar -czf nexus_backup.tar.gz backend/ frontend/ docker-compose.yml

# Restore
docker-compose up -d
docker-compose exec -T postgres psql -U postgres nexus_db < emergency_backup.sql
```

---

## Getting Help

1. **Check logs first**: `docker-compose logs -f`
2. **Verify .env files**: Correct credentials and URLs
3. **Check documentation**: QUICK_START.md, FASTAPI_GUIDE.md
4. **Test endpoints**: Use curl or Postman
5. **Browser DevTools**: Check Network and Console tabs
6. **Ask for help**: Include full error message and logs

---

**Version**: 1.0
**Last Updated**: February 2026
**Status**: Complete ✅
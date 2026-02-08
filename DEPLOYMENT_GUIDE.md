# Nexus Trading Platform - Deployment Guide

## Prerequisites

- Docker & Docker Compose
- PostgreSQL 12+
- Redis 6+
- Python 3.9+
- Node.js 16+
- Domain name (for production)
- SSL certificate (for production)

---

## Development Deployment

### 1. Local Setup (Docker)

```bash
# Clone repository
git clone https://github.com/your-org/nexus-trading.git
cd nexus-trading

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Update environment variables
nano backend/.env
nano frontend/.env

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend python django_core/manage.py migrate

# Create superuser
docker-compose exec backend python django_core/manage.py createsuperuser
```

### 2. Verify Services

```bash
# Check all containers running
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Test API
curl http://localhost:8000/health

# Access dashboard
open http://localhost:5173
```

---

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Environment Configuration

```bash
# Create app directory
sudo mkdir -p /var/www/nexus
cd /var/www/nexus

# Clone repository
sudo git clone https://github.com/your-org/nexus-trading.git .

# Create environment files
sudo cp backend/.env.example backend/.env
sudo cp frontend/.env.example frontend/.env

# Edit for production
sudo nano backend/.env
sudo nano frontend/.env

# Key variables to set:
# DJANGO_SECRET_KEY=<generate-random>
# DEBUG=False
# ENVIRONMENT=production
# DATABASE_URL=postgresql://user:pass@postgres:5432/nexus_prod
# REDIS_URL=redis://redis:6379/0
# ALLOWED_HOSTS=nexus.com,www.nexus.com
# CORS_ALLOWED_ORIGINS=https://nexus.com,https://www.nexus.com
```

### 3. SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d nexus.com -d www.nexus.com

# Verify certificate
sudo ls -la /etc/letsencrypt/live/nexus.com/
```

### 4. Production Docker Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: nexus_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - nexus-network

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - nexus-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DEBUG=False
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: always
    volumes:
      - static_data:/app/staticfiles
    networks:
      - nexus-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - VITE_API_URL=https://api.nexus.com/api/v1
      - VITE_WS_URL=wss://api.nexus.com/ws
    restart: always
    networks:
      - nexus-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/nexus.com:/etc/nginx/ssl:ro
      - static_data:/app/staticfiles:ro
    depends_on:
      - backend
      - frontend
    restart: always
    networks:
      - nexus-network

volumes:
  postgres_data:
  redis_data:
  static_data:

networks:
  nexus-network:
    driver: bridge
```

### 5. Nginx Configuration

Create `nginx.prod.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # HTTPS redirect
    server {
        listen 80;
        server_name nexus.com www.nexus.com;
        return 301 https://$server_name$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name nexus.com www.nexus.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Frontend
        location / {
            proxy_pass http://frontend:5173;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }

        # WebSocket
        location /ws/ {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /app/staticfiles/;
            expires 30d;
        }
    }
}
```

### 6. Deploy

```bash
# Pull latest code
git pull origin main

# Update environment if needed
sudo nano backend/.env

# Start services
sudo docker-compose -f docker-compose.prod.yml up -d

# Run migrations
sudo docker-compose -f docker-compose.prod.yml exec backend python django_core/manage.py migrate

# Collect static files
sudo docker-compose -f docker-compose.prod.yml exec backend python django_core/manage.py collectstatic --no-input

# Verify
sudo docker-compose -f docker-compose.prod.yml ps
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl https://nexus.com/api/v1/health

# Check container status
docker-compose ps

# View logs
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
```

### Backup Database

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres nexus_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres nexus_db < backup_20240115.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Stop services
docker-compose down

# Rebuild images
docker-compose build

# Run migrations
docker-compose exec backend python django_core/manage.py migrate

# Start services
docker-compose up -d
```

---

## Troubleshooting

### Database Connection Error
```bash
# Check database logs
docker-compose logs postgres

# Verify credentials in .env
grep DATABASE_URL backend/.env

# Restart services
docker-compose down
docker-compose up -d
```

### WebSocket Connection Failed
```bash
# Check logs
docker-compose logs backend

# Verify WebSocket URL in frontend
grep VITE_WS_URL frontend/.env

# Check reverse proxy configuration
curl http://localhost/ws/test
```

### High Memory Usage
```bash
# Check container memory
docker stats

# Increase Docker memory limit
# Edit docker-compose.yml and add:
# services:
#   backend:
#     mem_limit: 2g
```

---

## Performance Optimization

### Database
- Enable pg_stat_statements
- Add indexes on frequently queried fields
- Regular VACUUM and ANALYZE

### Caching
- Use Redis for session caching
- Cache API responses with TTL
- Implement CDN for static files

### Application
- Use gunicorn with multiple workers
- Enable gzip compression
- Implement rate limiting
- Use connection pooling

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Setup regular backups
- [ ] Monitor error logs
- [ ] Implement rate limiting
- [ ] Enable CORS carefully
- [ ] Use environment variables for secrets
- [ ] Regular security updates

---

**Deployment Status**: Production Ready ✅
**Last Updated**: February 2026
# 🚢 Deployment Guide

Production deployment guide for Twitch Tools Web Suite.

---

## Deployment Options

### Recommended Stacks

1. **VPS (Ubuntu/Debian) - Full Control**
2. **Vercel (Frontend) + Railway (Backend + DB)**
3. **Netlify (Frontend) + Render (Backend + DB)**
4. **Digital Ocean (Full Stack)**
5. **AWS (Advanced)**

---

## Option 1: VPS Deployment (Ubuntu/Debian + Nginx)

Complete guide for deploying on your own VPS with full control.

### Prerequisites

- Ubuntu 20.04+ or Debian 11+ VPS
- Root or sudo access
- Domain name pointed to your VPS IP
- Node.js 18+ installed
- PostgreSQL 14+ installed
- Nginx installed

### Step 1: Clone Repository

```bash
# Navigate to web directory
cd /var/www/html

# Clone repository
git clone https://github.com/yourusername/twitch-developer-hub.git
cd twitch-developer-hub
```

### Step 2: Configure PostgreSQL

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE twitch_dev_hub;
CREATE USER your_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE twitch_dev_hub TO your_user;

# Grant schema permissions
\c twitch_dev_hub
GRANT ALL PRIVILEGES ON SCHEMA public TO your_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO your_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO your_user;
ALTER SCHEMA public OWNER TO your_user;
\q
```

### Step 3: Backend Setup

```bash
cd server

# Create .env file
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/twitch_dev_hub?schema=public"

# JWT Configuration (generate with: openssl rand -hex 32)
JWT_SECRET="your_64_character_random_secret_here"

# Encryption Key (must be exactly 32 characters)
ENCRYPTION_KEY="your_32_character_key_here_xxxx"

# Server Configuration
PORT=3002
NODE_ENV=production

# CORS - URL del frontend (use hyphen, NOT underscore)
FRONTEND_URL="https://your-domain.com"
EOF

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Build TypeScript
npm run build

# Start server in background
nohup node dist/index.js > /var/log/twitch-dev-hub-backend.log 2>&1 &

# Verify server is running
ps aux | grep "node dist/index.js"
tail -f /var/log/twitch-dev-hub-backend.log
```

### Step 4: Frontend Setup

```bash
cd ../client

# Create .env file (IMPORTANT: Use hyphens in domain, NOT underscores)
cat > .env << 'EOF'
# Backend API URL
VITE_API_URL=https://your-domain.com/api

# App Configuration
VITE_APP_NAME=Twitch Tools Suite
VITE_APP_VERSION=1.0.0
EOF

# Install dependencies (ignore post-install scripts if needed)
npm install --ignore-scripts

# Build for production
npm run build

# Verify build
ls -lh dist/
```

### Step 5: Configure Nginx

**IMPORTANT: Use hyphens (-) in domain names, NOT underscores (_)**
Nginx has issues with underscores in server names by default.

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/twitch-dev-hub << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL Certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # Frontend files
    root /var/www/html/twitch-developer-hub/client/dist;
    index index.html;

    client_max_body_size 5M;

    # API Backend Proxy
    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs
    access_log /var/log/nginx/twitch-dev-hub.access.log;
    error_log /var/log/nginx/twitch-dev-hub.error.log;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/twitch-dev-hub /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 6: SSL Certificate with Let's Encrypt

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Follow prompts:
# - Enter email
# - Accept Terms of Service
# - Choose redirect option (2 for Yes)

# Verify auto-renewal
sudo certbot renew --dry-run

# Certificate auto-renews via systemd timer
sudo systemctl status certbot.timer
```

### Step 7: Keep Server Running

The backend is currently running with `nohup`. For production, consider:

**Option A: systemd service (Recommended)**

```bash
sudo tee /etc/systemd/system/twitch-dev-hub.service << 'EOF'
[Unit]
Description=Twitch Developer Hub API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html/twitch-developer-hub/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=twitch-dev-hub

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable twitch-dev-hub
sudo systemctl start twitch-dev-hub
sudo systemctl status twitch-dev-hub
```

**Option B: PM2 (Alternative)**

```bash
npm install -g pm2

cd /var/www/html/twitch-developer-hub/server
pm2 start dist/index.js --name twitch-dev-hub-api
pm2 save
pm2 startup
```

### Common Issues & Solutions

#### Issue: `ERR_NAME_NOT_RESOLVED`
**Cause:** Frontend trying to connect to old domain with underscores
**Solution:** Rebuild frontend after updating `.env` with correct domain:
```bash
cd client
npm run build
```

#### Issue: Nginx 404 on /api requests
**Cause:** Wrong port in Nginx config or backend not running
**Solution:**
```bash
# Check backend is running
ps aux | grep node
sudo lsof -i :3002

# Check Nginx config
grep proxy_pass /etc/nginx/sites-available/twitch-dev-hub
```

#### Issue: TypeScript compilation errors
**Cause:** Strict type checking with Prisma
**Solution:** Already fixed in `tsconfig.json`:
- `exactOptionalPropertyTypes: false`
- `noImplicitAny: false`
- `noUnusedLocals: false`

#### Issue: Database permission errors
**Cause:** PostgreSQL user lacks schema permissions
**Solution:** See Step 2 for complete permission grants

### Updating the Application

```bash
# Pull latest changes
cd /var/www/html/twitch-developer-hub
git pull

# Update backend
cd server
npm install
npx prisma generate
npx prisma db push
npm run build

# Restart backend
sudo systemctl restart twitch-dev-hub
# OR with PM2: pm2 restart twitch-dev-hub-api

# Update frontend
cd ../client
npm install --ignore-scripts
npm run build

# Clear browser cache (Ctrl+Shift+R)
```

### Monitoring

```bash
# Backend logs
tail -f /var/log/twitch-dev-hub-backend.log
# OR with systemd: sudo journalctl -u twitch-dev-hub -f

# Nginx logs
sudo tail -f /var/log/nginx/twitch-dev-hub.access.log
sudo tail -f /var/log/nginx/twitch-dev-hub.error.log

# Check backend status
curl http://localhost:3002/health
curl https://your-domain.com/api
```

---

## Option 1: Vercel + Railway (Easiest)

### Backend Deployment (Railway)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL**
   - Click "New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-configures `DATABASE_URL`

4. **Configure Environment Variables**
   ```env
   PORT=3000
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generated_secret>
   ENCRYPTION_KEY=<32_char_key>
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

5. **Configure Build**
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

6. **Deploy**
   - Railway auto-deploys on push to main branch

### Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure**
   - Root Directory: `client`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables**
   ```env
   VITE_API_URL=https://your-backend.railway.app/api
   VITE_APP_NAME=Twitch Tools Suite
   VITE_APP_VERSION=1.0.0
   ```

5. **Deploy**
   - Click "Deploy"
   - Auto-deploys on push to main

---

## Option 2: Render (Full Stack)

### PostgreSQL Database

1. Create new PostgreSQL instance
2. Copy connection string

### Backend Service

1. **New Web Service**
   - Connect GitHub repo
   - Root Directory: `server`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

2. **Environment Variables**
   ```env
   DATABASE_URL=<from_render_postgres>
   NODE_ENV=production
   JWT_SECRET=<secret>
   ENCRYPTION_KEY=<key>
   CORS_ORIGIN=<frontend_url>
   ```

### Frontend (Static Site)

1. **New Static Site**
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Environment Variables**
   ```env
   VITE_API_URL=<backend_url>/api
   ```

---

## Pre-Deployment Checklist

### Security

- [ ] Generate secure `JWT_SECRET` (64+ characters)
- [ ] Generate secure `ENCRYPTION_KEY` (exactly 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Use HTTPS for all endpoints
- [ ] Enable rate limiting
- [ ] Review Helmet security headers

### Database

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Create database backups
- [ ] Set up connection pooling

### Code

- [ ] Remove console.logs
- [ ] Build without errors: `npm run build`
- [ ] Test production build locally
- [ ] Update API URLs in frontend

### Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Configure logging
- [ ] Set up uptime monitoring

---

## Environment Variables Reference

### Backend (Production)

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Security
JWT_SECRET=<64_char_random_string>
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d
ENCRYPTION_KEY=<32_char_random_string>

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (Production)

```env
VITE_API_URL=https://api.your-domain.com/api
VITE_APP_NAME=Twitch Tools Suite
VITE_APP_VERSION=1.0.0
```

---

## Generate Secure Keys

### JWT Secret (64 characters)

```bash
openssl rand -base64 64
```

### Encryption Key (32 characters)

```bash
openssl rand -base64 32 | cut -c1-32
```

---

## Database Migrations

### In Production

```bash
# Deploy migrations (non-interactive)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**Important:** Never use `npx prisma migrate dev` in production!

---

## Custom Domain Setup

### Backend

1. Add custom domain in Railway/Render
2. Configure DNS:
   ```
   A Record: api.yourdomain.com → <service_ip>
   ```

### Frontend

1. Add custom domain in Vercel
2. Configure DNS:
   ```
   A Record: @ → 76.76.21.21
   CNAME: www → cname.vercel-dns.com
   ```

---

## SSL/TLS Certificates

- **Vercel:** Auto SSL (Let's Encrypt)
- **Railway:** Auto SSL
- **Render:** Auto SSL
- **Manual:** Use Certbot + Let's Encrypt

---

## Monitoring & Logging

### Recommended Tools

- **Error Tracking:** Sentry
- **Uptime Monitoring:** UptimeRobot
- **Analytics:** Google Analytics
- **Logging:** Logtail, Papertrail

### Setup Sentry (Example)

```bash
npm install @sentry/node @sentry/react
```

Backend:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

Frontend:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
});
```

---

## Performance Optimization

### Backend

- Enable compression
- Use connection pooling
- Cache frequent queries (Redis)
- Optimize database indexes

### Frontend

- Code splitting
- Lazy loading routes
- Image optimization
- CDN for static assets

---

## Backup Strategy

### Database Backups

- **Automated:** Daily backups (Railway/Render)
- **Manual:** `pg_dump` weekly

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Code Backups

- GitHub repository
- Tagged releases

---

## Scaling

### Vertical Scaling

Increase server resources:
- More CPU
- More RAM
- Faster database

### Horizontal Scaling

- Load balancer
- Multiple server instances
- Read replicas for database
- Redis caching layer

---

## Troubleshooting

### Build Fails

- Check Node.js version
- Clear build cache
- Verify all dependencies installed

### Database Connection Fails

- Check `DATABASE_URL` format
- Verify database is running
- Check firewall rules

### CORS Errors

- Verify `CORS_ORIGIN` matches frontend URL
- Include protocol (https://)
- Check for trailing slashes

---

## Post-Deployment

1. Test all endpoints
2. Monitor error logs
3. Check performance metrics
4. Set up alerts
5. Create admin account
6. Test full user flow

---

**[⬆ Back to Main README](../README.md)**

# 📘 Getting Started with Twitch Tools Web Suite

Welcome to Twitch Tools! This guide will help you set up the project on your local machine.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [First Steps](#first-steps)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** (v18 or higher)
  ```bash
  node --version  # Should be v18.0.0 or higher
  ```

- **npm** (comes with Node.js)
  ```bash
  npm --version
  ```

- **PostgreSQL** (v14 or higher)
  ```bash
  psql --version
  ```

- **Git**
  ```bash
  git --version
  ```

### Optional but Recommended

- **VS Code** or your preferred code editor
- **Postman** or **Insomnia** for API testing
- **pgAdmin** or **TablePlus** for database management

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/twitch-developer-hub.git
cd twitch-developer-hub
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

This will install all backend dependencies including:
- Express
- Prisma
- TypeScript
- JWT libraries
- And more...

### 3. Install Client Dependencies

```bash
cd ../client
npm install
```

This will install:
- React
- Vite
- Tailwind CSS 3.4.1
- TypeScript
- And more...

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE twitch_tools;

# Create user (optional, for better security)
CREATE USER twitch_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE twitch_tools TO twitch_admin;

# Exit
\q
```

### 2. Configure Database URL

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/twitch_tools?schema=public"
```

### 3. Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

---

## Configuration

### Server Configuration (server/.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/twitch_tools"

# JWT - Generate a secure random string
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d

# Encryption - MUST be exactly 32 characters
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-32-character-encryption-key-here!!!

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Client Configuration (client/.env)

```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Twitch Tools Suite
VITE_APP_VERSION=1.0.0
```

### Generate Secure Keys

**For JWT_SECRET:**
```bash
openssl rand -base64 64
```

**For ENCRYPTION_KEY (must be 32 chars):**
```bash
openssl rand -base64 32
```

---

## Running the Application

### Development Mode

You'll need **two terminal windows**:

#### Terminal 1 - Backend Server

```bash
cd server
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📡 Environment: development
🔗 Health check: http://localhost:3000/health
```

#### Terminal 2 - Frontend Server

```bash
cd client
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Verify Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Twitch Tools API is running",
  "timestamp": "2025-11-07T..."
}
```

---

## First Steps

### 1. Create Your First Account

1. Navigate to `http://localhost:5173`
2. Click **Sign Up**
3. Enter your email and password
4. Verify your account (if email is configured)

### 2. Add Twitch Client Configuration

1. Log in to your account
2. Go to **Settings** > **Twitch Configurations**
3. Click **Add Configuration**
4. Enter your:
   - **Client ID** (from [Twitch Developer Console](https://dev.twitch.tv/console))
   - **Client Secret**
   - **Configuration Name** (optional)

### 3. Generate Your First Token

#### User Access Token:
1. Go to **Token Manager** > **User Token**
2. Select desired scopes
3. Click **Generate Token**
4. Complete the OAuth flow
5. Copy your token!

#### App Access Token:
1. Go to **Token Manager** > **App Token**
2. Click **Generate Token**
3. Copy your token!

### 4. Manage Webhooks

1. Go to **Webhook Manager**
2. View all registered webhooks
3. Create new webhook subscriptions
4. Delete unwanted webhooks

---

## Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

**Solution:**
1. Ensure PostgreSQL is running:
   ```bash
   # On Linux/Mac
   sudo systemctl status postgresql

   # On macOS with Homebrew
   brew services list
   ```

2. Check your `DATABASE_URL` in `.env`
3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port in server/.env
PORT=3001
```

### Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
cd server
npx prisma generate
```

### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
1. Check `CORS_ORIGIN` in `server/.env` matches your frontend URL
2. Restart the backend server
3. Clear browser cache

### TypeScript Errors

**Error:** Various TypeScript compilation errors

**Solution:**
```bash
# Server
cd server
npx tsc --noEmit

# Client
cd client
npm run build
```

### Environment Variables Not Loading

**Error:** `JWT_SECRET is not defined`

**Solution:**
1. Ensure `.env` file exists in `server/` directory
2. Restart the development server
3. Check for typos in variable names

---

## Next Steps

- **[Architecture Overview](02-ARCHITECTURE.md)** - Understand how the system works
- **[Database Guide](03-DATABASE.md)** - Learn about the data model
- **[API Reference](04-API-REFERENCE.md)** - Explore the API endpoints
- **[Frontend Guide](05-FRONTEND-GUIDE.md)** - Dive into the React codebase

---

## Need Help?

- **Documentation:** Check other guides in the `docs/` folder
- **Issues:** [GitHub Issues](https://github.com/yourusername/twitch-developer-hub/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/twitch-developer-hub/discussions)

---

**[⬆ Back to Main README](../README.md)**

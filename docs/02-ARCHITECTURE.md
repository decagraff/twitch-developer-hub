# 🏗️ Architecture Overview

This document provides a comprehensive overview of the Twitch Tools Web Suite architecture, design patterns, and technical decisions.

---

## 📋 Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Design Patterns](#design-patterns)
- [Scalability Considerations](#scalability-considerations)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │          React + TypeScript + Vite               │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   Pages    │  │ Components │  │   Store    │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │  Services  │  │   Utils    │  │   Types    │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST (JSON)
                     │ Port 5173 → 3000
┌────────────────────▼────────────────────────────────────┐
│                     SERVER LAYER                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Node.js + Express + TypeScript             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   Routes   │→ │Controllers │→ │   Models   │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │ Middleware │  │   Config   │  │   Utils    │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma ORM
                     │ SQL Queries
┌────────────────────▼────────────────────────────────────┐
│                   DATABASE LAYER                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │              PostgreSQL 14+                      │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐    │  │
│  │  │Users │  │Tokens│  │Configs│ │Webhooks │    │  │
│  │  └──────┘  └──────┘  └──────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
                     │ External API Calls
                     ▼
        ┌────────────────────────┐
        │   Twitch API (OAuth)   │
        │  - Device Flow         │
        │  - Token Generation    │
        │  - EventSub Webhooks   │
        └────────────────────────┘
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI library for building components |
| TypeScript | 5.9.x | Type safety and better DX |
| Vite | 7.x | Fast build tool and dev server |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| React Router | 7.x | Client-side routing |
| Zustand | 5.x | Lightweight state management |
| Axios | 1.x | HTTP client for API requests |
| React Hot Toast | 2.x | Toast notifications |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express | 5.x | Web application framework |
| TypeScript | 5.9.x | Type safety |
| Prisma | 6.x | ORM and database toolkit |
| PostgreSQL | 14+ | Relational database |
| JWT | 9.x | Authentication tokens |
| bcryptjs | 3.x | Password hashing |
| Helmet | 8.x | Security headers |
| Morgan | 1.x | HTTP request logging |

---

## System Components

### Client Components

#### 1. **Pages**
- Landing page
- Authentication (Login/Register)
- Dashboard
- Token Manager
- Webhook Manager
- Settings/Profile

#### 2. **Components**
- Reusable UI components
- Form components
- Layout components
- Navigation components

#### 3. **Store (Zustand)**
- `authStore` - User authentication state
- `tokenStore` - Token management state
- `webhookStore` - Webhook management state
- `configStore` - App configuration

#### 4. **Services**
- `authService.ts` - Authentication API calls
- `tokenService.ts` - Token operations
- `webhookService.ts` - Webhook operations
- `api.ts` - Axios instance configuration

### Server Components

#### 1. **Routes**
```
/api/auth
  POST   /register
  POST   /login
  POST   /refresh
  POST   /logout

/api/users
  GET    /me
  PUT    /me
  DELETE /me

/api/configs
  GET    /
  POST   /
  PUT    /:id
  DELETE /:id

/api/tokens
  GET    /
  POST   /user
  POST   /app
  DELETE /:id

/api/webhooks
  GET    /
  POST   /
  DELETE /:id
```

#### 2. **Controllers**
- Handle business logic
- Validate requests
- Format responses
- Error handling

#### 3. **Models**
- User management
- Token operations
- Webhook operations
- Twitch API integration

#### 4. **Middleware**
- Authentication (`authMiddleware`)
- Validation (`validationMiddleware`)
- Error handling (`errorMiddleware`)
- Rate limiting
- CORS handling
- Security headers (Helmet)

---

## Data Flow

### Authentication Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  Client  │       │  Server  │       │ Database │       │  Twitch  │
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                  │
     │ 1. Register      │                   │                  │
     ├─────────────────>│                   │                  │
     │                  │ 2. Hash Password  │                  │
     │                  ├──────────────────>│                  │
     │                  │ 3. Create User    │                  │
     │                  │<──────────────────┤                  │
     │                  │ 4. Generate JWT   │                  │
     │ 5. Return Token  │                   │                  │
     │<─────────────────┤                   │                  │
     │                  │                   │                  │
```

### Token Generation Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  Client  │       │  Server  │       │ Database │       │  Twitch  │
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                  │
     │ 1. Request Token │                   │                  │
     ├─────────────────>│                   │                  │
     │                  │ 2. Get Config     │                  │
     │                  ├──────────────────>│                  │
     │                  │<──────────────────┤                  │
     │                  │ 3. Decrypt Secret │                  │
     │                  │ 4. Call Twitch    │                  │
     │                  ├──────────────────────────────────────>│
     │                  │ 5. Return Token   │                  │
     │                  │<──────────────────────────────────────┤
     │                  │ 6. Encrypt & Save │                  │
     │                  ├──────────────────>│                  │
     │ 7. Return Token  │                   │                  │
     │<─────────────────┤                   │                  │
     │                  │                   │                  │
```

---

## Security Architecture

### 1. **Password Security**

```typescript
// Passwords are hashed using bcrypt with salt rounds
const hashedPassword = await bcrypt.hash(password, 12);
```

### 2. **JWT Authentication**

```typescript
// Access Token (short-lived)
const accessToken = jwt.sign(
  { userId: user.id },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// Refresh Token (long-lived)
const refreshToken = jwt.sign(
  { userId: user.id },
  JWT_SECRET,
  { expiresIn: '30d' }
);
```

### 3. **Encryption for Sensitive Data**

All Client Secrets and Access Tokens are encrypted using **AES-256-GCM**:

```typescript
// Encryption: salt:iv:tag:encrypted
const encrypted = encrypt(clientSecret);

// Decryption
const decrypted = decrypt(encrypted);
```

**Key Derivation:** PBKDF2 with 100,000 iterations

### 4. **Security Headers (Helmet)**

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

### 5. **Rate Limiting**

```typescript
// 100 requests per 15 minutes
windowMs: 15 * 60 * 1000,
max: 100
```

### 6. **CORS Protection**

```typescript
cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
})
```

---

## Design Patterns

### 1. **MVC Pattern (Backend)**

```
Model → Business Logic & Data Access
View → JSON Responses
Controller → Request Handling
```

### 2. **Repository Pattern**

```typescript
// Abstracts database operations
class UserRepository {
  async create(data) { ... }
  async findById(id) { ... }
  async update(id, data) { ... }
}
```

### 3. **Service Layer Pattern**

```typescript
// Business logic separated from controllers
class TokenService {
  async generateUserToken() { ... }
  async generateAppToken() { ... }
}
```

### 4. **Middleware Chain**

```typescript
router.post('/tokens',
  authMiddleware,
  validateMiddleware,
  rateLimitMiddleware,
  tokenController.generate
);
```

### 5. **Component Composition (Frontend)**

```tsx
<Layout>
  <Header />
  <Sidebar>
    <Navigation />
  </Sidebar>
  <Content>
    <Page />
  </Content>
</Layout>
```

---

## Scalability Considerations

### Current Architecture (Single Server)

Good for:
- Up to 10,000 users
- Moderate traffic
- Development and testing

### Future Scalability Options

#### 1. **Horizontal Scaling**

```
Load Balancer
    │
    ├─> Server 1
    ├─> Server 2
    └─> Server 3
          │
          └─> Shared PostgreSQL
```

#### 2. **Database Optimization**

- Connection pooling (Prisma)
- Read replicas for queries
- Caching layer (Redis)
- Database indexing

#### 3. **Caching Strategy**

```
Client → CDN → Server → Redis Cache → Database
```

#### 4. **Microservices (Future)**

```
API Gateway
    │
    ├─> Auth Service
    ├─> Token Service
    └─> Webhook Service
```

#### 5. **Message Queue**

For async operations:
- Email sending
- Webhook processing
- Token refresh

---

## Performance Optimizations

### Frontend

- Code splitting with React.lazy()
- Memoization with React.memo()
- Virtual scrolling for long lists
- Optimistic UI updates
- Debounced search inputs

### Backend

- Database query optimization
- Prepared statements (Prisma)
- Response compression
- Efficient error handling
- Async/await throughout

### Database

- Indexed columns for queries
- Foreign key constraints
- Cascading deletes
- Proper data types

---

## Next Steps

- **[Database Guide](03-DATABASE.md)** - Deep dive into the data model
- **[API Reference](04-API-REFERENCE.md)** - Complete API documentation
- **[Frontend Guide](05-FRONTEND-GUIDE.md)** - React architecture details

---

**[⬆ Back to Main README](../README.md)**

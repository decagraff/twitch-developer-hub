# 🗄️ Database Guide

Complete guide to the database schema, migrations, and Prisma ORM usage.

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │
│ email       │◄───────┐
│ password    │        │
│ name        │        │
│ createdAt   │        │
│ updatedAt   │        │
└─────────────┘        │
                       │ 1:N
         ┌─────────────┼─────────────┬─────────────┐
         │             │             │             │
┌────────▼────────┐   │    ┌────────▼────────┐   │
│ TwitchConfig    │   │    │  SavedToken     │   │
├─────────────────┤   │    ├─────────────────┤   │
│ id (PK)         │   │    │ id (PK)         │   │
│ userId (FK)     │───┘    │ userId (FK)     │───┘
│ clientId        │        │ tokenType       │
│ clientSecret    │        │ accessToken     │
│ name            │        │ scopes[]        │
│ createdAt       │        │ channelId       │
│ updatedAt       │        │ expiresAt       │
└─────────────────┘        │ createdAt       │
                           │ updatedAt       │
                           └─────────────────┘
                                    │
                           ┌────────▼────────┐
                           │    Webhook      │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ userId (FK)     │
                           │ subscriptionId  │
                           │ type            │
                           │ callbackUrl     │
                           │ status          │
                           │ cost            │
                           │ createdAt       │
                           │ updatedAt       │
                           └─────────────────┘
```

---

## Tables

### Users

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique user identifier |
| email | String | UNIQUE, NOT NULL | User email (login) |
| password | String | NOT NULL | Hashed password (bcrypt) |
| name | String | NULLABLE | Display name |
| createdAt | DateTime | DEFAULT now() | Account creation |
| updatedAt | DateTime | AUTO | Last update |

**Indexes:**
- `email` (unique)

---

### TwitchConfig

Stores Twitch Client ID and Secret for each user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Config identifier |
| userId | UUID | FK → users.id | Owner |
| clientId | String | NOT NULL | Twitch Client ID |
| clientSecret | String | NOT NULL | **Encrypted** Client Secret |
| name | String | NULLABLE | Config nickname |
| createdAt | DateTime | DEFAULT now() | Creation time |
| updatedAt | DateTime | AUTO | Last update |

**Relationships:**
- `user` → User (CASCADE delete)

**Security:**
- `clientSecret` is encrypted with AES-256-GCM before storage

---

### SavedToken

Stores generated Twitch tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Token identifier |
| userId | UUID | FK → users.id | Owner |
| tokenType | String | NOT NULL | "user" or "app" |
| accessToken | String | NOT NULL | **Encrypted** access token |
| scopes | String[] | NOT NULL | Array of OAuth scopes |
| channelId | String | NULLABLE | For user tokens |
| expiresAt | DateTime | NULLABLE | Token expiration |
| createdAt | DateTime | DEFAULT now() | Generation time |
| updatedAt | DateTime | AUTO | Last update |

**Relationships:**
- `user` → User (CASCADE delete)

**Security:**
- `accessToken` is encrypted with AES-256-GCM

---

### Webhook

Stores EventSub webhook subscriptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Webhook identifier |
| userId | UUID | FK → users.id | Owner |
| subscriptionId | String | UNIQUE, NOT NULL | Twitch subscription ID |
| type | String | NOT NULL | EventSub type |
| callbackUrl | String | NOT NULL | Webhook callback URL |
| status | String | NOT NULL | Subscription status |
| cost | Int | DEFAULT 0 | EventSub cost |
| createdAt | DateTime | DEFAULT now() | Creation time |
| updatedAt | DateTime | AUTO | Last update |

**Relationships:**
- `user` → User (CASCADE delete)

**Indexes:**
- `subscriptionId` (unique)

---

## Prisma Schema

See `server/prisma/schema.prisma` for the complete schema definition.

---

## Common Queries

### Create User

```typescript
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: hashedPassword,
    name: 'John Doe'
  }
});
```

### Find User by Email

```typescript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});
```

### Get User with All Relations

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    twitchConfigs: true,
    savedTokens: true,
    webhooks: true
  }
});
```

### Create Twitch Config

```typescript
const config = await prisma.twitchConfig.create({
  data: {
    userId: user.id,
    clientId: 'abc123',
    clientSecret: encrypt('secret123'),
    name: 'My App'
  }
});
```

### Save Token

```typescript
const token = await prisma.savedToken.create({
  data: {
    userId: user.id,
    tokenType: 'user',
    accessToken: encrypt('token_here'),
    scopes: ['user:read:email', 'channel:read:subscriptions'],
    channelId: '123456',
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  }
});
```

---

## Migrations

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Apply Migrations

```bash
npx prisma migrate deploy
```

### Reset Database

```bash
npx prisma migrate reset
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Prisma Studio

View and edit your database with a GUI:

```bash
npx prisma studio
```

Accessible at: `http://localhost:5555`

---

## Best Practices

1. **Always encrypt sensitive data**
   - Client Secrets
   - Access Tokens
   - Refresh Tokens

2. **Use transactions for multi-step operations**
   ```typescript
   await prisma.$transaction([
     prisma.user.create({...}),
     prisma.twitchConfig.create({...})
   ]);
   ```

3. **Handle cascade deletes carefully**
   - Deleting a user deletes all their data

4. **Use indexes for frequent queries**
   - Email lookups
   - Subscription ID lookups

5. **Validate data before insertion**
   - Use Zod or similar validation library

---

**[⬆ Back to Main README](../README.md)** | **[Next: API Reference →](04-API-REFERENCE.md)**

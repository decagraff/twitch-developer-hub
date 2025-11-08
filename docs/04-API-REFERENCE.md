# 🔌 API Reference

Complete REST API documentation for the Twitch Tools backend.

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 🔐 Authentication

#### Register

```http
POST /api/auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

#### Login

```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": "uuid", "email": "...", "name": "..." },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

#### Refresh Token

```http
POST /api/auth/refresh
```

**Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "new_jwt_token"
}
```

---

### 👤 Users

#### Get Current User

```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T..."
}
```

---

#### Update User

```http
PUT /api/users/me
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

**Response:** `200 OK`

---

### ⚙️ Twitch Configurations

#### List Configurations

```http
GET /api/configs
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "clientId": "abc123",
    "name": "My App",
    "tokensCount": 3,
    "createdAt": "2025-11-07T...",
    "updatedAt": "2025-11-07T..."
  }
]
```

**Note:**
- Client secrets are never returned
- `tokensCount` shows how many active tokens are using this configuration

---

#### Create Configuration

```http
POST /api/configs
Authorization: Bearer <token>
```

**Body:**
```json
{
  "clientId": "your_twitch_client_id",
  "clientSecret": "your_twitch_client_secret",
  "name": "My Twitch App"
}
```

**Response:** `201 Created`

---

#### Update Configuration

```http
PUT /api/configs/:id
Authorization: Bearer <token>
```

**Body:**
```json
{
  "clientId": "updated_client_id",
  "clientSecret": "updated_client_secret",
  "name": "Updated App Name"
}
```

**Response:** `200 OK`

---

#### Validate Configuration

Validate Twitch credentials before saving.

```http
POST /api/twitch-configs/validate
Authorization: Bearer <token>
```

**Body:**
```json
{
  "clientId": "your_twitch_client_id",
  "clientSecret": "your_twitch_client_secret"
}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "message": "Credentials are valid",
  "expiresIn": 5184000
}
```

**Error Response:** `200 OK` (validation failed)
```json
{
  "valid": false,
  "message": "Invalid client credentials"
}
```

---

#### Delete Configuration

```http
DELETE /api/configs/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

**Error Response:** `400 Bad Request` (if tokens exist)
```json
{
  "error": "Bad request",
  "message": "Cannot delete configuration. There are 3 token(s) using this configuration."
}
```

**Note:** Configurations with active tokens cannot be deleted

---

### 🎫 Tokens

#### List Saved Tokens

```http
GET /api/tokens
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "tokenType": "user",
    "scopes": ["user:read:email"],
    "channelId": "123456",
    "expiresAt": "2025-12-07T...",
    "createdAt": "2025-11-07T..."
  }
]
```

**Note:** Access tokens are never returned in list

---

#### Generate User Access Token

```http
POST /api/tokens/user
Authorization: Bearer <token>
```

**Body:**
```json
{
  "configId": "uuid",
  "scopes": ["user:read:email", "channel:read:subscriptions"]
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "decrypted_token_here",
  "scopes": ["user:read:email"],
  "channelId": "123456",
  "expiresAt": "2025-12-07T..."
}
```

---

#### Generate App Access Token

```http
POST /api/tokens/app
Authorization: Bearer <token>
```

**Body:**
```json
{
  "configId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "app_access_token_here",
  "expiresAt": "2025-12-07T..."
}
```

---

### 🪝 EventSub Webhooks

#### List Webhooks

```http
GET /api/webhooks
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "subscriptionId": "twitch_sub_id",
      "type": "channel.update",
      "condition": {
        "broadcaster_user_id": "123456",
        "moderator_user_id": "123456"
      },
      "callbackUrl": "https://...",
      "status": "enabled",
      "cost": 0,
      "createdAt": "2025-11-07T..."
    }
  ]
}
```

---

#### Get EventSub Types

Get all available EventSub subscription types.

```http
GET /api/webhooks/types
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "types": [
    {
      "type": "stream.online",
      "version": "1",
      "description": "A broadcaster starts a stream",
      "condition": { "broadcaster_user_id": "required" }
    },
    {
      "type": "channel.follow",
      "version": "2",
      "description": "A user follows a broadcaster",
      "condition": {
        "broadcaster_user_id": "required",
        "moderator_user_id": "required"
      }
    }
  ]
}
```

---

#### Get Remote Webhooks

Fetch EventSub subscriptions directly from Twitch API.

```http
GET /api/webhooks/remote
Authorization: Bearer <token>
```

**Requirements:**
- Requires at least one app token

**Response:** `200 OK`
```json
{
  "subscriptions": [...],
  "total": 15,
  "max_total_cost": 100,
  "total_cost": 10
}
```

---

#### Sync Webhooks

Synchronize EventSub subscriptions from Twitch API to local database.

```http
POST /api/webhooks/sync
Authorization: Bearer <token>
```

**Body (Optional):**
```json
{
  "configId": "uuid"  // Optional: sync specific config, omit to sync all
}
```

**Response:** `200 OK`
```json
{
  "message": "Webhooks synchronized successfully",
  "imported": 5,
  "updated": 3,
  "removed": 1,
  "total": 15,
  "configsSynced": "Nightbot, StreamElements"
}
```

---

#### Create Webhook

```http
POST /api/webhooks
Authorization: Bearer <token>
```

**Body:**
```json
{
  "tokenId": "uuid",
  "type": "channel.update",
  "condition": {
    "broadcaster_user_id": "123456"
  },
  "callbackUrl": "https://your-domain.com/webhooks"
}
```

**Response:** `201 Created`
```json
{
  "message": "EventSub subscription created successfully",
  "webhook": {
    "id": "uuid",
    "subscriptionId": "twitch_sub_id",
    "type": "channel.update",
    "condition": { "broadcaster_user_id": "123456" },
    "callbackUrl": "https://...",
    "status": "webhook_callback_verification_pending",
    "cost": 0
  }
}
```

---

#### Delete Webhook

```http
DELETE /api/webhooks/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Webhook deleted successfully"
}
```

---

### 📝 API Logs

#### List API Logs

Get history of API calls made through the API Tester.

```http
GET /api/logs?limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "logs": [
    {
      "id": "uuid",
      "method": "GET",
      "endpoint": "/users",
      "status": 200,
      "requestBody": null,
      "responseBody": "{...}",
      "error": null,
      "createdAt": "2025-11-07T..."
    }
  ],
  "total": 50
}
```

---

#### Get Single Log

```http
GET /api/logs/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "log": {
    "id": "uuid",
    "method": "POST",
    "endpoint": "/eventsub/subscriptions",
    "status": 201,
    "requestBody": "{...}",
    "responseBody": "{...}",
    "error": null,
    "createdAt": "2025-11-07T..."
  }
}
```

---

#### Create API Log

```http
POST /api/logs
Authorization: Bearer <token>
```

**Body:**
```json
{
  "tokenId": "uuid",
  "method": "GET",
  "endpoint": "/users",
  "status": 200,
  "requestBody": null,
  "responseBody": "{...}",
  "error": null
}
```

**Response:** `201 Created`

---

#### Delete Log

```http
DELETE /api/logs/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

#### Delete All Logs

```http
DELETE /api/logs
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

---

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per window
- **Response:** `429 Too Many Requests`

---

**[⬆ Back to Main README](../README.md)** | **[Next: Frontend Guide →](05-FRONTEND-GUIDE.md)**

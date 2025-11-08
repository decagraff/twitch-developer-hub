# 🧪 Pruebas de API de Autenticación

Guía para probar los endpoints de autenticación antes de crear el frontend.

---

## 🔧 Requisitos

- Servidor corriendo: `npm run dev`
- Cliente HTTP: Postman, Insomnia, o cURL

---

## 📝 Endpoints Disponibles

### 1. **Registrar Usuario**

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

**Respuesta exitosa (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "2025-11-07T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**Error - Usuario ya existe (409):**
```json
{
  "error": "Conflict",
  "message": "User with this email already exists"
}
```

---

### 2. **Login**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "2025-11-07T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**Error - Credenciales inválidas (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

---

### 3. **Obtener Usuario Actual** (Requiere token)

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer TU_ACCESS_TOKEN_AQUI
```

**Respuesta exitosa (200):**
```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "name": "Test User",
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T..."
}
```

**Error - Sin token (401):**
```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

---

### 4. **Refresh Token**

```http
POST http://localhost:3000/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "TU_REFRESH_TOKEN_AQUI"
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "nuevo_token_aqui",
  "refreshToken": "nuevo_refresh_token"
}
```

---

## 🧪 Ejemplo de Prueba Completa con cURL

### Paso 1: Registrar usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Paso 2: Guardar el accessToken de la respuesta

```bash
# Copia el accessToken de la respuesta anterior
TOKEN="eyJhbGciOiJIUzI1..."
```

### Paso 3: Obtener usuario actual

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Validaciones

### Email inválido

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "invalid-email",
  "password": "password123"
}
```

**Respuesta (400):**
```json
{
  "error": "Validation Error",
  "messages": ["Invalid email format"]
}
```

### Password muy corto

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "12345"
}
```

**Respuesta (400):**
```json
{
  "error": "Validation Error",
  "messages": ["Password must be at least 6 characters long"]
}
```

---

## ✅ Verificar en Prisma Studio

```bash
cd server
npx prisma studio
```

Ve a http://localhost:5555 y verifica:
- Tabla `users` tiene el nuevo usuario
- El password está hasheado (NO en texto plano)

---

## 🎯 Próximos Pasos

Una vez verificado que todo funciona:
- ✅ Fase 2 completada
- ➡️ Continuar con Fase 3: Frontend (Login y Register pages)

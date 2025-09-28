# Authentication API Documentation

## Overview

The Scrumboard Authentication API provides secure user authentication and authorization using JWT tokens. The system implements a comprehensive authentication flow with features including user registration, login, token refresh, password management, email verification, and session management.

## Base Information

- **Base URL**: `http://localhost:3001` (development) / `https://your-domain.com` (production)
- **API Prefix**: `/auth`
- **Content-Type**: `application/json`
- **Authentication**: Bearer JWT tokens

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database

    Client->>API: POST /auth/register
    API->>Database: Create user
    API-->>Client: 201 Created

    Client->>API: POST /auth/verify-email
    API->>Database: Verify email token
    API-->>Client: 200 OK

    Client->>API: POST /auth/login
    API->>Database: Validate credentials
    API-->>Client: 200 OK + Access/Refresh tokens

    Client->>API: GET /auth/me (with Bearer token)
    API->>Database: Validate token & get user
    API-->>Client: 200 OK + User data

    Client->>API: POST /auth/refresh
    API->>Database: Validate refresh token
    API-->>Client: 200 OK + New tokens

    Client->>API: POST /auth/logout
    API->>Database: Revoke tokens
    API-->>Client: 204 No Content
```

## Token Management

### Access Tokens
- **Type**: JWT
- **Lifetime**: 15 minutes
- **Usage**: Include in `Authorization: Bearer <token>` header for protected endpoints

### Refresh Tokens
- **Type**: Secure random string
- **Lifetime**: 7 days
- **Storage**: Database with user association
- **Usage**: Exchange for new access tokens

## API Endpoints

### 1. User Registration

**Endpoint**: `POST /auth/register`

**Description**: Register a new user account

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 characters)",
  "name": "string (required)",
  "role": "string (optional, enum: ADMIN, SCRUM_MASTER, PRODUCT_OWNER, DEVELOPER, STAKEHOLDER, MEMBER)"
}
```

**Response Codes**:
- `201 Created` - User successfully registered
- `400 Bad Request` - Validation errors
- `409 Conflict` - Email already exists

**Success Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "DEVELOPER",
  "emailVerified": false,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "message": ["Please provide a valid email address"],
  "error": "Bad Request"
}
```

**Rate Limiting**: 5 requests per minute

---

### 2. User Login

**Endpoint**: `POST /auth/login`

**Description**: Authenticate user and return access/refresh tokens

**Request Headers**:
```
Content-Type: application/json
User-Agent: string (optional, for session tracking)
```

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response Codes**:
- `200 OK` - Login successful
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid credentials
- `423 Locked` - Account locked due to multiple failed attempts

**Success Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "DEVELOPER",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "secure-random-string",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Rate Limiting**: 10 requests per minute

---

### 3. Token Refresh

**Endpoint**: `POST /auth/refresh`

**Description**: Exchange refresh token for new access and refresh tokens

**Request Headers**:
```
Content-Type: application/json
User-Agent: string (optional, for session tracking)
```

**Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

**Response Codes**:
- `200 OK` - Tokens refreshed successfully
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid or expired refresh token

**Success Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-secure-random-string",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Rate Limiting**: 20 requests per minute

---

### 4. User Logout

**Endpoint**: `POST /auth/logout`

**Description**: Logout user and revoke refresh tokens

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body** (optional):
```json
{
  "refreshToken": "string (optional, specific token to revoke)"
}
```

**Response Codes**:
- `204 No Content` - Logout successful
- `401 Unauthorized` - Invalid or missing access token

**Success Response**: No content

---

### 5. Get Current User

**Endpoint**: `GET /auth/me`

**Description**: Get current authenticated user information

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response Codes**:
- `200 OK` - User data retrieved
- `401 Unauthorized` - Invalid or missing access token

**Success Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "DEVELOPER",
  "emailVerified": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 6. Email Verification

**Endpoint**: `POST /auth/verify-email`

**Description**: Verify user email address using verification token

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "string (required, email verification token)"
}
```

**Response Codes**:
- `200 OK` - Email verified successfully
- `400 Bad Request` - Invalid or expired token

**Success Response**:
```json
{
  "message": "Email successfully verified"
}
```

**Rate Limiting**: 10 requests per minute

---

### 7. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Description**: Request password reset email

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "string (required, valid email)"
}
```

**Response Codes**:
- `200 OK` - Password reset email sent (always returns success for security)
- `400 Bad Request` - Validation errors

**Success Response**:
```json
{
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

**Rate Limiting**: 3 requests per minute

---

### 8. Reset Password

**Endpoint**: `POST /auth/reset-password`

**Description**: Reset password using reset token

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "token": "string (required, password reset token)",
  "newPassword": "string (required, min 8 characters)"
}
```

**Response Codes**:
- `200 OK` - Password reset successfully
- `400 Bad Request` - Invalid token or validation errors

**Success Response**:
```json
{
  "message": "Password successfully reset"
}
```

**Rate Limiting**: 5 requests per minute

---

### 9. Change Password

**Endpoint**: `POST /auth/change-password`

**Description**: Change password for authenticated user

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 characters)"
}
```

**Response Codes**:
- `200 OK` - Password changed successfully
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid current password or access token

**Success Response**:
```json
{
  "message": "Password successfully changed"
}
```

**Rate Limiting**: 5 requests per minute

---

### 10. Get User Sessions

**Endpoint**: `GET /auth/sessions`

**Description**: Get all active sessions for the authenticated user

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response Codes**:
- `200 OK` - Sessions retrieved successfully
- `401 Unauthorized` - Invalid or missing access token

**Success Response**:
```json
[
  {
    "id": "session-uuid",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUsedAt": "2024-01-01T12:00:00.000Z",
    "isActive": true
  }
]
```

---

### 11. Revoke Session

**Endpoint**: `DELETE /auth/sessions/:id`

**Description**: Revoke a specific user session

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**URL Parameters**:
- `id` (string, required): Session ID to revoke

**Response Codes**:
- `204 No Content` - Session revoked successfully
- `401 Unauthorized` - Invalid or missing access token
- `404 Not Found` - Session not found or not owned by user

**Success Response**: No content

**Rate Limiting**: 10 requests per minute

## Security Considerations

### Password Security
- Minimum 8 characters required
- Passwords are hashed using bcrypt with configurable salt rounds
- Failed login attempts are tracked and accounts are temporarily locked after 5 failed attempts

### Token Security
- Access tokens are short-lived (15 minutes)
- Refresh tokens are stored securely in database with user association
- Tokens can be revoked individually or in bulk during logout

### Session Management
- IP address and User-Agent tracking for security monitoring
- Multiple active sessions supported
- Session revocation available for individual or all sessions

### Rate Limiting
- Different limits for different endpoints based on security sensitivity
- Brute force protection on authentication endpoints
- Higher limits for token refresh to support normal application flow

### CORS and Headers
- Configurable CORS origins
- Security headers via Helmet middleware
- Content-Type validation

## Environment Variables

### Required Variables
```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production-minimum-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production-minimum-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Authentication Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800000
HASH_SALT_LENGTH=16
```

### Optional Variables
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Security Headers
HELMET_ENABLED=true

# Session Management
SESSION_SECRET=your-session-secret-change-this-in-production-minimum-32-chars
```

## Error Handling

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Error description or array of validation errors",
  "error": "Error type"
}
```

### Common Error Codes
- `400 Bad Request`: Validation errors, malformed requests
- `401 Unauthorized`: Invalid credentials, expired tokens
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Email already exists
- `423 Locked`: Account temporarily locked
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server errors

## Quick Start Guide

### 1. Environment Setup
1. Copy `.env.example` to `.env`
2. Configure database connection and JWT secrets
3. Run database migrations: `npm run db:migrate`

### 2. Basic Authentication Flow
```bash
# 1. Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# 2. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 3. Use access token for protected endpoints
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Refresh tokens when needed
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 3. Frontend Integration
See `authentication-examples.md` for detailed JavaScript/TypeScript examples.

## API Testing

Use the provided Postman collection (`postman-collection.json`) for comprehensive API testing with:
- Pre-configured environments
- Automated token management
- Response validation tests
- Example requests for all endpoints

## Support

For questions and support:
- API Issues: Create an issue in the project repository
- Security Concerns: Contact the development team directly
- Feature Requests: Submit via the project's issue tracker
# User Profile API Endpoints

> **Status**: ✅ Implementation Complete
> **Version**: 1.0.0
> **Base URL**: `http://localhost:3001/api/v1`
> **Swagger UI**: `http://localhost:3001/api/docs`
> **Issue**: #57 - Implement User Profile API Endpoints

## Table of Contents

- [Authentication](#authentication)
- [Authorization](#authorization)
- [Endpoints](#endpoints)
  - [Get User Profile](#get-user-profile)
  - [Update User Profile](#update-user-profile)
  - [Upload Avatar](#upload-avatar)
  - [Change Password](#change-password)
  - [Get User Activity](#get-user-activity)
- [Data Models](#data-models)
- [Error Responses](#error-responses)
- [Integration Examples](#integration-examples)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All user profile endpoints require authentication via JWT Bearer token.

```http
Authorization: Bearer <access_token>
```

**Obtaining Access Token:**
```bash
# Login to get access token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cm4rcxxb20000xqiw2ofsphwl",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "DEVELOPER"
  }
}
```

---

## Authorization

User profile endpoints enforce the following authorization rules:

| Endpoint | Rule |
|----------|------|
| GET /users/:id | User can view their own profile OR has ADMIN role |
| PATCH /users/:id | User can update their own profile OR has ADMIN role |
| POST /users/:id/avatar | User can update their own avatar OR has ADMIN role |
| PATCH /users/:id/password | User can change their own password only |
| GET /users/:id/activity | User can view their own activity OR has ADMIN role |

---

## Endpoints

### Get User Profile

Retrieve detailed information about a user profile.

**Endpoint:** `GET /users/:id`

**Authentication:** Required

**Authorization:** User must be accessing their own profile or have ADMIN role

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User unique identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include | string[] | No | Additional data to include (e.g., 'activity', 'projects') |

**Request Example:**

```bash
curl -X GET http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response: 200 OK**

```json
{
  "id": "cm4rcxxb20000xqiw2ofsphwl",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "DEVELOPER",
  "avatar": "/uploads/avatars/user-123.jpg",
  "timeZone": "America/New_York",
  "workingHours": "{\"start\": \"09:00\", \"end\": \"17:00\"}",
  "notificationPrefs": "{\"email\": true, \"push\": false, \"inApp\": true}",
  "emailVerified": true,
  "isActive": true,
  "lastLoginAt": "2025-10-15T16:30:00Z",
  "loginCount": 42,
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T16:45:00Z"
}
```

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 401 Unauthorized | Missing or invalid token | `{ "statusCode": 401, "message": "Unauthorized" }` |
| 403 Forbidden | User cannot access this profile | `{ "statusCode": 403, "message": "Forbidden resource" }` |
| 404 Not Found | User not found | `{ "statusCode": 404, "message": "User not found" }` |

---

### Update User Profile

Update user profile information.

**Endpoint:** `PATCH /users/:id`

**Authentication:** Required

**Authorization:** User must be updating their own profile or have ADMIN role

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User unique identifier |

**Request Body Schema:**

```typescript
{
  name?: string;              // Full name (2-100 characters)
  avatar?: string;            // Avatar URL or path (max 500 characters)
  timeZone?: string;          // User timezone in IANA format (max 100 characters)
  workingHours?: string;      // Working hours as JSON string
  notificationPrefs?: string; // Notification preferences as JSON string
}
```

**Request Example:**

```bash
curl -X PATCH http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "timeZone": "America/Los_Angeles",
    "workingHours": "{\"start\": \"08:00\", \"end\": \"16:00\"}",
    "notificationPrefs": "{\"email\": true, \"push\": true, \"inApp\": true}"
  }'
```

**Success Response: 200 OK**

```json
{
  "id": "cm4rcxxb20000xqiw2ofsphwl",
  "email": "user@example.com",
  "name": "John Smith",
  "role": "DEVELOPER",
  "avatar": "/uploads/avatars/user-123.jpg",
  "timeZone": "America/Los_Angeles",
  "workingHours": "{\"start\": \"08:00\", \"end\": \"16:00\"}",
  "notificationPrefs": "{\"email\": true, \"push\": true, \"inApp\": true}",
  "emailVerified": true,
  "isActive": true,
  "lastLoginAt": "2025-10-15T16:30:00Z",
  "loginCount": 42,
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T16:50:00Z"
}
```

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 400 Bad Request | Invalid input data | `{ "statusCode": 400, "message": ["name must be longer than or equal to 2 characters"], "error": "Bad Request" }` |
| 401 Unauthorized | Missing or invalid token | `{ "statusCode": 401, "message": "Unauthorized" }` |
| 403 Forbidden | User cannot update this profile | `{ "statusCode": 403, "message": "Forbidden resource" }` |
| 404 Not Found | User not found | `{ "statusCode": 404, "message": "User not found" }` |
| 429 Too Many Requests | Rate limit exceeded | `{ "statusCode": 429, "message": "Too many requests" }` |

**Validation Rules:**

- `name`: 2-100 characters
- `avatar`: Maximum 500 characters
- `timeZone`: Maximum 100 characters (IANA timezone format recommended)
- `workingHours`: JSON string (e.g., `{"start": "09:00", "end": "17:00"}`)
- `notificationPrefs`: JSON string (e.g., `{"email": true, "push": false, "inApp": true}`)

**Rate Limiting:** 10 requests per minute per user

---

### Upload Avatar

Upload a new avatar image for the user profile.

**Endpoint:** `POST /users/:id/avatar`

**Authentication:** Required

**Authorization:** User must be uploading their own avatar or have ADMIN role

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User unique identifier |

**Request Body:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| avatar | File | Yes | Image file (JPEG, PNG, JPG, max 5MB) |

**Request Example (using curl):**

```bash
curl -X POST http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "avatar=@/path/to/avatar.jpg"
```

**Request Example (using JavaScript fetch):**

```javascript
const formData = new FormData();
formData.append('avatar', avatarFile);

const response = await fetch('http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const data = await response.json();
```

**Success Response: 200 OK**

```json
{
  "id": "cm4rcxxb20000xqiw2ofsphwl",
  "email": "user@example.com",
  "name": "John Smith",
  "role": "DEVELOPER",
  "avatar": "/uploads/avatars/cm4rcxxb20000xqiw2ofsphwl-1697456789.jpg",
  "timeZone": "America/Los_Angeles",
  "workingHours": "{\"start\": \"08:00\", \"end\": \"16:00\"}",
  "notificationPrefs": "{\"email\": true, \"push\": true, \"inApp\": true}",
  "emailVerified": true,
  "isActive": true,
  "lastLoginAt": "2025-10-15T16:30:00Z",
  "loginCount": 42,
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T17:00:00Z"
}
```

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 400 Bad Request | Invalid file format or size | `{ "statusCode": 400, "message": "Invalid file type. Only JPG and PNG are allowed", "error": "Bad Request" }` |
| 401 Unauthorized | Missing or invalid token | `{ "statusCode": 401, "message": "Unauthorized" }` |
| 403 Forbidden | User cannot upload avatar for this profile | `{ "statusCode": 403, "message": "Forbidden resource" }` |
| 404 Not Found | User not found | `{ "statusCode": 404, "message": "User not found" }` |
| 413 Payload Too Large | File exceeds size limit | `{ "statusCode": 413, "message": "File size exceeds 5MB limit" }` |
| 429 Too Many Requests | Rate limit exceeded | `{ "statusCode": 429, "message": "Too many requests" }` |

**File Requirements:**

- **Formats**: JPEG, PNG, JPG
- **Maximum Size**: 5MB
- **Recommended Dimensions**: 400x400 pixels (will be resized/cropped)

**Rate Limiting:** 5 uploads per minute per user

---

### Change Password

Change the user's password.

**Endpoint:** `PATCH /users/:id/password`

**Authentication:** Required

**Authorization:** User can only change their own password (ADMIN cannot change other users' passwords)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User unique identifier |

**Request Body Schema:**

```typescript
{
  oldPassword: string;      // Current password (required for verification, 8-128 characters)
  newPassword: string;      // New password (8-128 characters, must include uppercase, lowercase, number, and special character)
}
```

**Request Example:**

```bash
curl -X PATCH http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPassword123!",
    "newPassword": "NewSecurePass123!"
  }'
```

**Success Response: 200 OK**

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 400 Bad Request | Invalid password format | `{ "statusCode": 400, "message": ["Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"], "error": "Bad Request" }` |
| 401 Unauthorized | Missing or invalid token | `{ "statusCode": 401, "message": "Unauthorized" }` |
| 401 Unauthorized | Current password incorrect | `{ "statusCode": 401, "message": "Incorrect old password" }` |
| 403 Forbidden | User cannot change another user's password | `{ "statusCode": 403, "message": "You can only change your own password" }` |
| 404 Not Found | User not found | `{ "statusCode": 404, "message": "User not found" }` |
| 429 Too Many Requests | Rate limit exceeded | `{ "statusCode": 429, "message": "Too many requests" }` |

**Password Requirements:**

- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&#^()_+-=[]{};':"\\|,.<>/?)

**Security Notes:**

- Current password verification is required
- New password cannot be the same as the current password
- Password is hashed using bcrypt before storage
- All active refresh tokens are invalidated after password change

**Rate Limiting:** 5 password change attempts per minute per user

---

### Get User Activity

Retrieve the user's activity log.

**Endpoint:** `GET /users/:id/activity`

**Authentication:** Required

**Authorization:** User can view their own activity or have ADMIN role

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User unique identifier |

**Query Parameters:**

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| limit | number | No | Number of activity records to return | 20 |
| offset | number | No | Number of records to skip (pagination) | 0 |
| type | string | No | Filter by activity type (e.g., 'login', 'profile_update') | all |
| startDate | string | No | Filter activities from this date (ISO 8601) | - |
| endDate | string | No | Filter activities until this date (ISO 8601) | - |

**Request Example:**

```bash
curl -X GET "http://localhost:3001/api/v1/users/cm4rcxxb20000xqiw2ofsphwl/activity" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Note:** Query parameters for filtering (limit, offset, type, startDate, endDate) are not currently implemented in the API but may be added in future versions.

**Success Response: 200 OK**

```json
[
  {
    "id": "act_123456",
    "type": "login",
    "description": "Successful login from 192.168.1.100",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "successful": true,
    "createdAt": "2025-10-15T16:30:00Z"
  },
  {
    "id": "act_123455",
    "type": "profile_update",
    "description": "Profile information updated",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "successful": true,
    "createdAt": "2025-10-15T16:25:00Z"
  },
  {
    "id": "act_123454",
    "type": "password_change",
    "description": "Password changed",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "successful": true,
    "createdAt": "2025-10-15T15:20:00Z"
  },
  {
    "id": "act_123453",
    "type": "avatar_upload",
    "description": "Avatar uploaded",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "successful": true,
    "createdAt": "2025-10-15T14:15:00Z"
  }
]
```

**Activity Types:**

Based on the `ActivityType` enum in the implementation:

- `login` - User login
- `profile_update` - Profile information updated
- `password_change` - Password changed
- `avatar_upload` - Avatar uploaded

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 400 Bad Request | Invalid query parameters | `{ "statusCode": 400, "message": "Invalid date format", "error": "Bad Request" }` |
| 401 Unauthorized | Missing or invalid token | `{ "statusCode": 401, "message": "Unauthorized" }` |
| 403 Forbidden | User cannot view this activity | `{ "statusCode": 403, "message": "Forbidden resource" }` |
| 404 Not Found | User not found | `{ "statusCode": 404, "message": "User not found" }` |

---

## Data Models

### User Profile Model

```typescript
interface UserProfile {
  id: string;                    // Unique identifier (CUID)
  email: string;                 // Email address (unique)
  name: string;                  // Full name
  role: UserRole;                // User role (ADMIN, PROJECT_MANAGER, DEVELOPER, VIEWER)
  avatar?: string;               // Avatar image path (optional)
  timeZone?: string;             // User timezone in IANA format (optional)
  workingHours?: string;         // Working hours as JSON string (optional)
  notificationPrefs?: string;    // Notification preferences as JSON string (optional)
  emailVerified: boolean;        // Email verification status
  isActive: boolean;             // Account active status
  lastLoginAt?: Date;            // Last login timestamp (optional)
  loginCount: number;            // Total number of logins
  createdAt: Date;               // Account creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

### User Role Enum

```typescript
enum UserRole {
  ADMIN = 'ADMIN',                   // Full system access
  PROJECT_MANAGER = 'PROJECT_MANAGER', // Can manage projects and users
  DEVELOPER = 'DEVELOPER',            // Can contribute to projects
  VIEWER = 'VIEWER'                   // Read-only access
}
```

### Activity Log Model

```typescript
interface ActivityLog {
  id: string;                    // Activity unique identifier
  type: ActivityType;            // Activity type (login, profile_update, password_change, avatar_upload)
  description: string;           // Human-readable description
  ipAddress?: string;            // IP address (optional)
  userAgent?: string;            // User agent string (optional)
  successful: boolean;           // Whether the activity was successful
  createdAt: Date;               // Activity timestamp
}
```

---

## Error Responses

All error responses follow a consistent format:

```typescript
interface ErrorResponse {
  statusCode: number;            // HTTP status code
  message: string | string[];    // Error message(s)
  error?: string;                // Error type (e.g., "Bad Request")
  timestamp?: string;            // Error timestamp
  path?: string;                 // Request path
}
```

### Common HTTP Status Codes

| Status Code | Description | When It Occurs |
|-------------|-------------|----------------|
| 200 OK | Success | Request completed successfully |
| 400 Bad Request | Invalid input | Validation errors, malformed data |
| 401 Unauthorized | Authentication failed | Missing/invalid token, wrong credentials |
| 403 Forbidden | Authorization failed | User lacks permission for resource |
| 404 Not Found | Resource not found | User ID doesn't exist |
| 409 Conflict | Resource conflict | Email already in use |
| 413 Payload Too Large | File too large | Avatar exceeds size limit |
| 429 Too Many Requests | Rate limit exceeded | Too many requests from client |
| 500 Internal Server Error | Server error | Unexpected server-side error |

---

## Integration Examples

### TypeScript/JavaScript Client

```typescript
class UserProfileAPI {
  private baseURL = 'http://localhost:3001/api/v1';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getProfile(userId: string) {
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }

    return response.json();
  }

  async updateProfile(userId: string, updates: Partial<{
    name: string;
    avatar: string;
    timeZone: string;
    workingHours: string;
    notificationPrefs: string;
  }>) {
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    return response.json();
  }

  async uploadAvatar(userId: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseURL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
        // Don't set Content-Type for multipart/form-data - browser will set it
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload avatar');
    }

    return response.json();
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const response = await fetch(`${this.baseURL}/users/${userId}/password`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to change password');
    }

    return response.json();
  }

  async getActivity(userId: string) {
    const response = await fetch(`${this.baseURL}/users/${userId}/activity`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage Example
const api = new UserProfileAPI(accessToken);

// Get profile
const profile = await api.getProfile('cm4rcxxb20000xqiw2ofsphwl');

// Update profile
const updated = await api.updateProfile('cm4rcxxb20000xqiw2ofsphwl', {
  name: 'John Smith',
  timeZone: 'America/New_York',
  notificationPrefs: JSON.stringify({ email: true, push: true, inApp: true })
});

// Upload avatar
const avatarInput = document.querySelector('#avatar-input') as HTMLInputElement;
const file = avatarInput.files?.[0];
if (file) {
  const result = await api.uploadAvatar('cm4rcxxb20000xqiw2ofsphwl', file);
}

// Change password
await api.changePassword('cm4rcxxb20000xqiw2ofsphwl', 'OldPass123!', 'NewPass123!');

// Get activity
const activity = await api.getActivity('cm4rcxxb20000xqiw2ofsphwl');
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface UseUserProfileOptions {
  accessToken: string;
}

export function useUserProfile({ accessToken }: UseUserProfileOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = new UserProfileAPI(accessToken);

  const updateProfile = useCallback(async (userId: string, updates: any) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.updateProfile(userId, updates);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.uploadAvatar(userId, file);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    loading,
    error,
    updateProfile,
    uploadAvatar,
    api
  };
}
```

### Error Handling Best Practices

```typescript
async function handleUpdateProfile(userId: string, updates: any) {
  try {
    const result = await api.updateProfile(userId, updates);
    console.log('Profile updated successfully:', result);
    return result;
  } catch (error) {
    if (error instanceof Response) {
      const errorData = await error.json();

      // Handle specific error codes
      switch (error.status) {
        case 400:
          console.error('Validation error:', errorData.message);
          // Show validation errors to user
          break;
        case 401:
          console.error('Authentication failed - redirecting to login');
          // Redirect to login page
          break;
        case 403:
          console.error('Permission denied');
          // Show permission error
          break;
        case 409:
          console.error('Email already in use');
          // Show conflict error
          break;
        default:
          console.error('Unexpected error:', errorData);
      }
    } else {
      console.error('Network or client error:', error);
    }

    throw error; // Re-throw for component error handling
  }
}
```

---

## Rate Limiting

User profile endpoints are subject to rate limiting to prevent abuse.

**Default Limits:**
- **Standard endpoints (GET)**: 60 requests per minute per IP (global default)
- **Profile update (PATCH /users/:id)**: 10 requests per minute per user
- **Avatar upload (POST /users/:id/avatar)**: 5 uploads per minute per user
- **Password change (PATCH /users/:id/password)**: 5 attempts per minute per user

**Rate Limit Headers:**

When approaching or exceeding limits, responses include:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1697456789
```

**Rate Limit Exceeded Response: 429 Too Many Requests**

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "error": "Too Many Requests"
}
```

---

## Swagger UI

Interactive API documentation is available via Swagger UI when the server is running:

**URL:** `http://localhost:3001/api/docs`

The Swagger UI provides:
- Interactive endpoint testing
- Request/response examples
- Schema definitions
- Authentication configuration

---

## Testing with Postman

A Postman collection is available for testing all user profile endpoints:

**Location:** `/docs/api/user-profile.postman_collection.json`

**Import Instructions:**
1. Open Postman
2. Click "Import" button
3. Select the collection JSON file
4. Configure collection variables (auto-configured in collection):
   - `baseUrl`: `http://localhost:3001/api/v1`
   - `accessToken`: Your JWT access token (will be set automatically after login)
   - `userId`: Your user ID (will be set automatically after login)

---

## Notes and Considerations

### Security

- All endpoints require valid JWT authentication
- Passwords are hashed using bcrypt with salt rounds of 10
- Avatar uploads are validated for file type and size
- User activity logs include IP addresses for security auditing
- Password change invalidates all refresh tokens

### Performance

- Activity logs are paginated for performance
- Avatar images should be optimized before upload
- Consider implementing caching for frequently accessed profiles

### Best Practices

1. **Token Management**: Store access tokens securely (httpOnly cookies or secure storage)
2. **Error Handling**: Always implement proper error handling in client applications
3. **Validation**: Validate user input on client-side before sending requests
4. **File Uploads**: Show upload progress and validate files before upload
5. **Activity Monitoring**: Implement activity log viewing in user dashboard

### Implementation Notes

✅ **Completed Features:**
- User profile retrieval with authorization
- Profile updates (name, avatar, timezone, working hours, notification preferences)
- Avatar file upload with validation (JPG/PNG, max 5MB)
- Password change with strong password requirements
- User activity log tracking
- Rate limiting on sensitive endpoints
- Full Swagger/OpenAPI documentation
- JWT Bearer authentication
- Role-based authorization

**Current Limitations:**
- Activity log does not support pagination or filtering (returns all activities)
- Avatar upload does not perform image resizing/optimization
- Working hours and notification preferences stored as JSON strings (not structured objects)
- No support for email change or verification workflows

### Future Enhancements

- [ ] Activity log pagination and filtering (limit, offset, type, date range)
- [ ] Avatar image cropping/resizing on upload
- [ ] Email change verification workflow
- [ ] Two-factor authentication
- [ ] Account deletion/deactivation
- [ ] Profile visibility settings
- [ ] Social profile links
- [ ] Structured objects for workingHours and notificationPrefs
- [ ] Image optimization and CDN integration

---

**Last Updated:** 2025-10-15
**API Version:** 1.0.0
**Documentation Status:** ✅ Complete and Accurate
**Implementation Status:** ✅ Fully Implemented

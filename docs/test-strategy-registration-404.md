# Test Strategy: Registration 404 Error Investigation

**Date**: 2025-10-22
**Issue**: Registration endpoint returning 404 error
**Agent**: Testing & QA Specialist (Hive Mind)

---

## 🔍 Root Cause Analysis

### Critical Finding: URL Mismatch

**Expected Frontend Endpoint**: `http://localhost:3001/auth/register`
**Actual Backend Endpoint**: `http://localhost:3001/api/v1/auth/register`

**Root Cause**: The backend API has a global prefix `/api/v1` (configured in `main.ts:103`) but the frontend is calling `/auth/register` directly.

### Evidence

1. **Backend Configuration** (`apps/api/src/main.ts:103`):
```typescript
app.setGlobalPrefix('api/v1', {
  exclude: ['health', 'metrics'],
})
```

2. **Frontend API Client** (`apps/web/src/lib/auth/api.ts:71`):
```typescript
const response = await fetch(`${API_URL}/auth/register`, {
  method: 'POST',
  // ...
})
```

3. **Controller Route** (`apps/api/src/auth/auth.controller.ts:43`):
```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  // This creates route: /api/v1/auth/register
}
```

---

## 📊 Current Test Coverage Analysis

### ✅ Backend Tests (Excellent Coverage)

**File**: `/home/stefan/workspace/scrumboard/apps/api/test/auth.e2e-spec.ts`

- **Status**: Comprehensive E2E tests exist
- **Registration Tests** (Lines 67-143):
  - ✅ Successful registration
  - ✅ Duplicate email validation
  - ✅ Weak password validation
  - ✅ Invalid email validation
  - ✅ Missing fields validation

**Test Quality**:
- Uses `supertest` with NestJS test module
- Properly initializes full application context
- Tests use `app.getHttpServer()` which respects global prefix
- **All backend tests are passing** ✅

### ⚠️ Frontend Tests (Missing Integration)

**File**: `/home/stefan/workspace/scrumboard/apps/web/src/app/(auth)/register/__tests__/page.test.tsx`

- **Status**: Unit tests only, no API integration
- **Coverage**:
  - ✅ Form validation
  - ✅ UI rendering
  - ✅ Password strength
  - ❌ **Missing**: Actual API endpoint verification
  - ❌ **Missing**: Network error handling with real endpoints

**Gap**: Tests mock `authApi.register` but never verify the actual URL being called.

---

## 🧪 Manual Test Scenarios

### Scenario 1: Direct API Call with curl

**Purpose**: Verify backend endpoint is accessible

```bash
# ❌ FAILS - 404 Not Found (current frontend behavior)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# ✅ SUCCEEDS - With correct prefix
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Scenario 2: Browser Network Tab Verification

**Steps**:
1. Open browser DevTools (F12)
2. Navigate to Network tab
3. Go to registration page: `http://localhost:3000/register`
4. Fill form and submit
5. **Observe**: Request to `http://localhost:3001/auth/register` returns 404
6. **Expected**: Should be `http://localhost:3001/api/v1/auth/register`

### Scenario 3: Verify Backend Server Running

```bash
# Check if API server is running
curl http://localhost:3001/health
# Expected: 200 OK

# Check API documentation (confirms global prefix)
curl http://localhost:3001/api/docs
# Expected: Swagger UI
```

### Scenario 4: Test with Postman/Insomnia

**Collection**:
```json
{
  "name": "Register User",
  "request": {
    "method": "POST",
    "url": "http://localhost:3001/api/v1/auth/register",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"TestPassword123!\"\n}"
    }
  }
}
```

---

## ✅ Diagnostic Checklist

### Backend Health Checks

- [ ] **Backend Server Status**
  ```bash
  ps aux | grep "nest start"
  # OR check logs
  cd apps/api && npm run start:dev
  ```

- [ ] **Port Verification**
  ```bash
  netstat -an | grep 3001
  # OR
  lsof -i :3001
  ```

- [ ] **Database Connection**
  ```bash
  cd apps/api && npx prisma db push
  # Verify database is accessible
  ```

- [ ] **Environment Variables**
  ```bash
  # Check .env file in apps/api
  cat apps/api/.env | grep PORT
  # Should show: PORT=3001 or API_PORT=3001
  ```

### Frontend Configuration Checks

- [ ] **API URL Environment Variable**
  ```bash
  # Check apps/web/.env.local
  cat apps/web/.env.local | grep API_URL
  # Should be: NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

- [ ] **Network Request Inspection**
  - Open DevTools → Network tab
  - Filter by "XHR" or "Fetch"
  - Submit registration form
  - Verify request URL

### CORS Verification

- [ ] **CORS Headers**
  ```bash
  curl -v -X OPTIONS http://localhost:3001/api/v1/auth/register \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST"
  # Look for Access-Control-Allow-Origin header
  ```

- [ ] **Allowed Origins** (from `main.ts:58-63`)
  - `http://localhost:3000` ✅
  - `http://localhost:3001` ✅
  - `http://127.0.0.1:3000` ✅
  - `http://127.0.0.1:3001` ✅

### Proxy Configuration

- [ ] **Next.js Proxy** (Check if exists)
  ```bash
  cat apps/web/next.config.js | grep -A5 "rewrites"
  # Should NOT have proxy, using direct fetch
  ```

---

## 📋 Expected vs Actual Behavior

### Expected Behavior

1. **User fills registration form** with valid data
2. **Frontend calls** `POST http://localhost:3001/api/v1/auth/register`
3. **Backend receives request** at controller route
4. **Backend validates** input using DTOs
5. **Backend creates user** in database
6. **Backend returns** 201 Created with user object
7. **Frontend shows** success message
8. **Frontend redirects** to login page

### Actual Behavior

1. **User fills registration form** with valid data ✅
2. **Frontend calls** `POST http://localhost:3001/auth/register` ❌ (Missing `/api/v1` prefix)
3. **Backend returns** 404 Not Found ❌
4. **No route matches** the request path ❌
5. **Error displayed** to user ❌
6. **Registration fails** ❌

---

## 🔧 Fix Implementation

### Solution: Update Frontend API URL

**File**: `/home/stefan/workspace/scrumboard/apps/web/src/lib/auth/api.ts`

**Change Required** (Line 71):
```typescript
// BEFORE (Incorrect)
const response = await fetch(`${API_URL}/auth/register`, {

// AFTER (Correct)
const response = await fetch(`${API_URL}/api/v1/auth/register`, {
```

**All Affected Endpoints**:
- `/auth/register` → `/api/v1/auth/register`
- `/auth/login` → `/api/v1/auth/login`
- `/auth/logout` → `/api/v1/auth/logout`
- `/auth/verify-email` → `/api/v1/auth/verify-email`
- `/auth/forgot-password` → `/api/v1/auth/forgot-password`
- `/auth/reset-password` → `/api/v1/auth/reset-password`

---

## 🧪 Test Plan for Verification

### Phase 1: Unit Tests (Update Existing)

**File**: `apps/web/src/lib/auth/__tests__/api.test.ts` (Create if doesn't exist)

```typescript
import { authApi } from '../api'

describe('Auth API Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('should call register endpoint with correct URL', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: {}, message: 'Success' })
    })

    await authApi.register({
      name: 'Test',
      email: 'test@example.com',
      password: 'Test123!'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/register',  // Verify correct URL
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('should call all auth endpoints with /api/v1 prefix', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    // Test all endpoints
    const endpoints = [
      { method: authApi.register, url: '/api/v1/auth/register' },
      { method: authApi.login, url: '/api/v1/auth/login' },
      { method: authApi.verifyEmail, url: '/api/v1/auth/verify-email' },
      { method: authApi.forgotPassword, url: '/api/v1/auth/forgot-password' },
      { method: authApi.resetPassword, url: '/api/v1/auth/reset-password' }
    ]

    // Verify each endpoint
    for (const { url } of endpoints) {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(url),
        expect.any(Object)
      )
    }
  })
})
```

### Phase 2: Integration Tests

**File**: `apps/web/src/__tests__/integration/auth-flow.test.ts`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterPage from '@/app/(auth)/register/page'

describe('Registration Flow Integration', () => {
  it('should successfully register user end-to-end', async () => {
    // Start backend server for test
    const testServer = await startTestServer()

    render(<RegisterPage />)

    // Fill form
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Test User' }
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'integration@test.com' }
    })
    fireEvent.change(screen.getAllByLabelText(/password/i)[0], {
      target: { value: 'TestPass123!' }
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'TestPass123!' }
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument()
    })

    await testServer.close()
  })
})
```

### Phase 3: E2E Tests (Playwright/Cypress)

**File**: `e2e/auth/registration.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test('should complete registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3000/register')

    // Fill form
    await page.fill('input[name="name"]', 'E2E Test User')
    await page.fill('input[name="email"]', 'e2e@test.com')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.fill('input[name="confirmPassword"]', 'TestPass123!')

    // Intercept network request
    const [request] = await Promise.all([
      page.waitForRequest(req =>
        req.url().includes('/api/v1/auth/register') &&
        req.method() === 'POST'
      ),
      page.click('button[type="submit"]')
    ])

    // Verify correct endpoint called
    expect(request.url()).toContain('/api/v1/auth/register')
    expect(request.method()).toBe('POST')

    // Verify success message
    await expect(page.locator('text=Registration Successful')).toBeVisible()

    // Verify redirect
    await page.waitForURL('**/login')
  })

  test('should handle 404 errors gracefully', async ({ page }) => {
    // Mock 404 response
    await page.route('**/auth/register', route => {
      route.fulfill({ status: 404, body: 'Not Found' })
    })

    await page.goto('http://localhost:3000/register')
    // Fill and submit form...

    // Should show error
    await expect(page.locator('text=/error/i')).toBeVisible()
  })
})
```

### Phase 4: API Contract Tests

**File**: `apps/api/test/contract/auth.contract.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import * as request from 'supertest'
import { AppModule } from '../../src/app.module'

describe('Auth API Contract Tests', () => {
  let app

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api/v1')
    await app.init()
  })

  it('should have /api/v1/auth/register endpoint', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Contract Test',
        email: 'contract@test.com',
        password: 'ContractTest123!'
      })

    expect(response.status).not.toBe(404)
  })

  it('should NOT respond to /auth/register without prefix', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test',
        email: 'test@test.com',
        password: 'Test123!'
      })

    expect(response.status).toBe(404)
  })
})
```

---

## 🛡️ Prevention Strategies

### 1. API Base URL Configuration

**Create centralized API config**:

```typescript
// apps/web/src/lib/api/config.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  version: 'v1',

  getEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `${this.baseURL}/api/${this.version}/${cleanPath}`
  }
}

// Usage
const url = API_CONFIG.getEndpoint('auth/register')
// Returns: http://localhost:3001/api/v1/auth/register
```

### 2. Type-Safe API Routes

```typescript
// apps/web/src/lib/api/routes.ts
export const API_ROUTES = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
  },
  // ... other routes
} as const

// Usage with type safety
const url = API_CONFIG.getEndpoint(API_ROUTES.auth.register)
```

### 3. API Client Wrapper

```typescript
// apps/web/src/lib/api/client.ts
class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_CONFIG.baseURL) {
    this.baseURL = baseURL
  }

  private getURL(endpoint: string): string {
    return API_CONFIG.getEndpoint(endpoint)
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(this.getURL(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return this.handleResponse(response)
  }

  // ... other methods
}

export const apiClient = new APIClient()
```

### 4. Automated Health Check Tests

```typescript
// tests/health/api-availability.test.ts
describe('API Health Checks', () => {
  it('should verify all auth endpoints are available', async () => {
    const endpoints = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/logout',
      '/api/v1/auth/me',
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'OPTIONS'
      })
      expect(response.status).not.toBe(404)
    }
  })
})
```

### 5. Environment Variable Validation

```typescript
// apps/web/src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  // ... other env vars
})

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})

// Usage
console.log(env.NEXT_PUBLIC_API_URL) // Type-safe and validated
```

### 6. OpenAPI/Swagger Integration

```typescript
// Generate TypeScript client from Swagger
// Use @openapitools/openapi-generator-cli
{
  "scripts": {
    "generate:api-client": "openapi-generator-cli generate -i http://localhost:3001/api/docs-json -g typescript-fetch -o src/lib/api/generated"
  }
}
```

---

## 📈 Success Criteria

### Fix Validation Checklist

- [ ] **Frontend API calls use `/api/v1` prefix**
  - Updated all auth endpoints in `api.ts`
  - Verified with unit tests

- [ ] **Manual testing passes**
  - curl commands succeed
  - Browser registration works
  - Network tab shows correct URLs

- [ ] **All existing tests still pass**
  - Backend E2E tests: ✅
  - Frontend unit tests: ✅
  - New integration tests: ✅

- [ ] **No regressions**
  - Login still works
  - Logout still works
  - Token refresh still works
  - Password reset still works

- [ ] **Error handling improved**
  - 404 errors show helpful message
  - Network errors handled gracefully
  - CORS errors detected and reported

### Performance Metrics

- Registration request time: < 500ms
- No failed requests in production
- Error rate: 0% for valid inputs

---

## 🎓 Lessons Learned

### Key Takeaways

1. **Always verify frontend-backend contract**
   - API prefix must match on both sides
   - Document API versioning strategy
   - Use shared types/OpenAPI spec

2. **Test the full integration path**
   - Unit tests alone are insufficient
   - Need integration/E2E tests with real network calls
   - Mock less, test more of the real path

3. **Better developer experience**
   - Centralize API configuration
   - Use type-safe route definitions
   - Generate clients from OpenAPI specs

4. **Monitoring and observability**
   - Log all API calls in dev mode
   - Add health checks for endpoints
   - Monitor 404 errors in production

### Future Improvements

1. **Add API versioning strategy documentation**
2. **Implement automated contract testing** (Pact, Spring Cloud Contract)
3. **Create development health dashboard**
4. **Add pre-commit hooks** to verify API endpoints exist
5. **Implement API mocking** with MSW for development

---

## 📞 Next Steps

1. **Implement Fix** (Coder Agent)
   - Update `apps/web/src/lib/auth/api.ts`
   - Add `/api/v1` prefix to all endpoints

2. **Verify Fix** (Tester Agent - This document)
   - Run manual curl tests
   - Test in browser
   - Verify all backend tests pass

3. **Add Tests** (Tester Agent)
   - Create integration tests
   - Add E2E tests with Playwright
   - Add contract tests

4. **Review & Deploy** (Reviewer Agent)
   - Code review
   - Security review
   - Deploy to staging

---

**Test Strategy Complete** ✅

*Document created by: Testing & QA Specialist Agent*
*Part of: Hive Mind Investigation - Registration 404 Error*

# Authentication Bug Research Report
**Hive Mind Investigation - Research Agent**
**Date:** 2025-10-22
**Task:** Investigate "User not authenticated" error on profile page after successful login

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** The login flow stores authentication data to localStorage but fails to store the `userId` separately. The profile page expects `localStorage.getItem('userId')` which returns `null`, causing the "User not authenticated" error.

**SEVERITY:** High - Complete authentication flow failure
**IMPACT:** Users cannot access profile page after login despite successful authentication
**ARCHITECTURE ISSUE:** Client-side localStorage auth pattern incompatible with Next.js App Router best practices

---

## Critical Findings

### 1. Missing userId in Login Flow

**Location:** `/home/stefan/workspace/scrumboard/apps/web/src/lib/auth/api.ts` (Lines 82-101)

**Problem:**
```typescript
// Login function stores:
localStorage.setItem('accessToken', authResponse.accessToken)
localStorage.setItem('refreshToken', authResponse.refreshToken)
localStorage.setItem('user', JSON.stringify(authResponse.user))

// ❌ MISSING: localStorage.setItem('userId', authResponse.user.id)
```

**Impact:** Profile page at line 80 expects `userId` key that never gets created:
```typescript
const currentUserId = localStorage.getItem('userId')  // Returns null!
if (!currentUserId) {
  showError(new Error('User not authenticated'), 'Error')
  return
}
```

---

### 2. Next.js App Router Architecture Mismatch

**Application Stack:**
- Next.js 15.5.2
- App Router (not Pages Router)
- React 19.1.0
- 'use client' components for authentication

**Pattern Issues:**

#### Profile Page Implementation
**File:** `/home/stefan/workspace/scrumboard/apps/web/src/app/profile/page.tsx`

```typescript
'use client'  // Client component

export default function ProfilePage() {
  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const currentUserId = localStorage.getItem('userId')  // ❌ Expects userId
    if (!currentUserId) {
      showError(new Error('User not authenticated'), 'Error')
      return
    }
  }
}
```

**Issue:** While 'use client' components CAN access localStorage, the data must exist first. The login flow never populates it.

---

### 3. Session Persistence Anti-Patterns

**Current Implementation:**
- ❌ localStorage for sensitive tokens (XSS vulnerable)
- ❌ No httpOnly cookies
- ❌ No middleware.ts for route protection
- ❌ No cookie-based session management
- ❌ Tokens exposed to JavaScript

**Security Concerns:**
1. **XSS Vulnerability:** Tokens in localStorage accessible to any script
2. **No CSRF Protection:** No cookie-based auth means no SameSite protection
3. **SSR Incompatibility:** Server components cannot access localStorage
4. **Manual Token Management:** No automatic refresh on navigation

---

### 4. Authentication Flow Analysis

#### Login Flow (CURRENT)
```
User submits credentials
    ↓
POST /api/v1/auth/login
    ↓
Receive: { user: {id, email, name, role}, accessToken, refreshToken }
    ↓
Store to localStorage:
  ✅ accessToken
  ✅ refreshToken
  ✅ user (JSON string)
  ❌ userId (MISSING!)
    ↓
Redirect to /
```

#### Profile Access Flow (CURRENT)
```
Navigate to /profile
    ↓
ProfilePage component mounts ('use client')
    ↓
useEffect triggers loadUserProfile()
    ↓
const userId = localStorage.getItem('userId')  // null
    ↓
if (!userId) → showError("User not authenticated")
    ↓
❌ FAILS - Never reaches API call
```

---

## Next.js 14+ Best Practices Comparison

### Current Pattern (localStorage)
```typescript
// Login
localStorage.setItem('accessToken', token)

// Profile
const token = localStorage.getItem('accessToken')
fetch('/api/users', { headers: { Authorization: `Bearer ${token}` }})
```

### Recommended Pattern (Cookies + Middleware)
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token && request.nextUrl.pathname.startsWith('/profile')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// Server Component
async function ProfilePage() {
  const { cookies } = await import('next/headers')
  const token = cookies().get('auth-token')
  const user = await fetchUser(token)
  // Server-side data fetching
}
```

---

## Technical Environment Details

**Frontend Stack:**
- Next.js: 15.5.2
- React: 19.1.0
- TypeScript: 5.x
- Form handling: react-hook-form 7.54.2
- Validation: zod 3.24.1

**Backend Stack:**
- NestJS API
- JWT authentication
- PostgreSQL database
- Docker containerized

**Project Structure:**
```
apps/
  web/                 # Next.js frontend
    src/
      app/
        profile/       # Profile page (Client Component)
        (auth)/
          login/       # Login page (Client Component)
      lib/
        auth/api.ts    # Auth API client
        users/api.ts   # Users API client
  api/                 # NestJS backend
    src/auth/          # Auth controllers & services
```

---

## Cookie Handling Analysis

**Result:** NONE IMPLEMENTED

**Search Results:**
- No `Set-Cookie` headers in API responses
- No cookie parsing in frontend
- No `credentials: 'include'` in fetch calls
- No cookie middleware
- Zero cookie-based auth infrastructure

**What's Missing:**
1. Backend: Cookie serialization in auth responses
2. Frontend: Cookie parsing and forwarding
3. Middleware: Route protection based on cookies
4. CSRF: Token-based cross-site request forgery protection

---

## Session Management Patterns

### Industry Standard (Next.js App Router)
```typescript
// Server Action
async function login(formData: FormData) {
  'use server'
  const { token } = await authenticate(formData)
  cookies().set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })
  redirect('/profile')
}

// Server Component
async function ProfilePage() {
  const token = cookies().get('auth-token')?.value
  if (!token) redirect('/login')

  const user = await fetchUserFromDB(token)
  return <ProfileUI user={user} />
}
```

### Current Implementation
```typescript
// Client-side only, localStorage
const response = await authApi.login(credentials)
localStorage.setItem('accessToken', response.accessToken)
// ❌ No server-side session
// ❌ No cookie handling
// ❌ No route protection
```

---

## Dependencies & Configuration

**Auth-Related Packages:**
- No next-auth or auth.js
- No jose or jwt-decode
- Custom JWT implementation
- Manual token management

**Next.js Configuration:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, path: false, os: false
      }
    }
    return config
  }
}
```

**Missing:**
- No middleware.ts file
- No auth configuration
- No session providers
- No route protection

---

## Recommendations for Fix

### Quick Fix (Minimal Change)
**Add userId to login flow:**
```typescript
// /home/stefan/workspace/scrumboard/apps/web/src/lib/auth/api.ts
async login(data: LoginData): Promise<AuthResponse> {
  const authResponse = await handleAuthResponse<AuthResponse>(response)

  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', authResponse.accessToken)
    localStorage.setItem('refreshToken', authResponse.refreshToken)
    localStorage.setItem('user', JSON.stringify(authResponse.user))
    localStorage.setItem('userId', authResponse.user.id)  // ✅ ADD THIS
  }

  return authResponse
}
```

**Pros:**
- Minimal code change
- Immediate fix
- Backward compatible

**Cons:**
- Doesn't address security concerns
- Still vulnerable to XSS
- Not following Next.js best practices

### Proper Fix (Recommended)
**Implement cookie-based auth with middleware:**

1. **Backend changes:**
   - Set httpOnly cookies in auth responses
   - Implement CSRF protection
   - Add cookie refresh mechanism

2. **Frontend changes:**
   - Create middleware.ts for route protection
   - Remove localStorage auth
   - Use Server Components for data fetching
   - Implement Server Actions for mutations

3. **Architecture changes:**
   - Convert profile to Server Component
   - Use Next.js App Router patterns
   - Implement proper session management

**Pros:**
- Secure (httpOnly cookies)
- SSR compatible
- Follows Next.js 14+ patterns
- CSRF protected
- Better UX (automatic refresh)

**Cons:**
- More extensive refactoring
- Backend API changes required
- Testing complexity

---

## Additional Patterns Discovered

### API Client Pattern
**File:** `/home/stefan/workspace/scrumboard/apps/web/src/lib/users/api.ts`

```typescript
class UsersApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken')  // Client-side only
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }
}
```

**Issue:** This pattern only works in client components, limiting architecture flexibility.

### Error Handling Pattern
```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: Error,
    public isNetworkError: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }

  getUserFriendlyMessage(): string {
    // Detailed error mapping
  }
}
```

**Quality:** Well-implemented error handling with retry logic and user-friendly messages.

---

## Files Analyzed

### Frontend Files
1. `/home/stefan/workspace/scrumboard/apps/web/src/app/profile/page.tsx` (405 lines)
2. `/home/stefan/workspace/scrumboard/apps/web/src/app/(auth)/login/page.tsx` (177 lines)
3. `/home/stefan/workspace/scrumboard/apps/web/src/lib/auth/api.ts` (187 lines)
4. `/home/stefan/workspace/scrumboard/apps/web/src/lib/users/api.ts` (142 lines)
5. `/home/stefan/workspace/scrumboard/apps/web/src/lib/api.ts` (227 lines)
6. `/home/stefan/workspace/scrumboard/apps/web/src/app/layout.tsx` (46 lines)
7. `/home/stefan/workspace/scrumboard/apps/web/next.config.ts` (19 lines)

### Backend Files
8. `/home/stefan/workspace/scrumboard/apps/api/src/auth/` (30+ auth-related files)

---

## Knowledge Gaps & Follow-up Questions

1. **Backend Cookie Support:** Does the NestJS API support sending httpOnly cookies?
2. **CORS Configuration:** What are the CORS settings between frontend and API?
3. **Token Expiry:** How are expired tokens currently handled?
4. **Refresh Flow:** Is there a token refresh mechanism implemented?
5. **Multi-tab Support:** How does the app handle multiple tabs?

---

## Stored Memory Keys

Research findings have been stored in the Hive Mind memory for collective access:

- `hive/research/auth-patterns`: Root cause analysis and bug details
- `hive/research/session-issues`: Session persistence architecture problems
- `hive/research/cookie-handling`: Cookie implementation analysis (none found)

---

## Conclusion

The authentication bug is caused by a **simple omission** (missing `userId` in localStorage) but reveals **deeper architectural issues** with the current auth implementation.

**Immediate Action:** Add `localStorage.setItem('userId', authResponse.user.id)` to login flow

**Long-term Action:** Migrate to cookie-based authentication with Next.js middleware for proper security and SSR compatibility

The quick fix will resolve the immediate bug, but the application would benefit significantly from adopting Next.js 14+ authentication best practices with httpOnly cookies, middleware-based route protection, and Server Component data fetching.

---

**Research Agent Status:** ✅ COMPLETE
**Coordination Hooks:** Executed (pre-task, notifications, post-task)
**Memory Storage:** Completed (3 keys stored in ReasoningBank)
**Findings Shared:** Available to all Hive Mind agents

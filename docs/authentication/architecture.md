# Authentication Architecture for Scrum Board Application

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Authentication Flow Architecture](#authentication-flow-architecture)
4. [System Components](#system-components)
5. [Integration Points](#integration-points)
6. [Database Schema](#database-schema)
7. [Security Considerations](#security-considerations)
8. [Scalability Architecture](#scalability-architecture)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Monitoring and Observability](#monitoring-and-observability)

## Executive Summary

This document outlines the comprehensive authentication architecture for the Scrum Board Next.js application. The design leverages **JWT tokens with refresh token rotation** as the primary authentication mechanism, integrated with **Next.js middleware** for seamless server-side and client-side protection.

### Key Architectural Decisions
- **JWT + Refresh Token Strategy**: Balances security and performance
- **HttpOnly Cookies**: Secure token storage preventing XSS attacks
- **Redis Session Store**: Scalable session management and token blacklisting
- **OAuth 2.0 Integration**: Support for multiple identity providers
- **Next.js Middleware**: Unified authentication layer across SSR/SSG/API routes

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser]
        Mobile[Mobile App]
    end

    subgraph "Next.js Application"
        Middleware[Next.js Middleware]
        Pages[Pages/Components]
        API[API Routes]
        Auth[Auth Service]
    end

    subgraph "Backend Services"
        NestAPI[NestJS API]
        Database[(PostgreSQL)]
        Redis[(Redis Cache)]
    end

    subgraph "External Services"
        OAuth[OAuth Providers]
        Email[Email Service]
    end

    Browser --> Middleware
    Mobile --> Middleware
    Middleware --> Pages
    Middleware --> API
    API --> Auth
    Auth --> NestAPI
    Auth --> Redis
    NestAPI --> Database
    Auth --> OAuth
    Auth --> Email

    classDef primary fill:#e1f5fe
    classDef secondary fill:#f3e5f5
    classDef external fill:#fff3e0

    class Middleware,Auth primary
    class Database,Redis secondary
    class OAuth,Email external
```

## Authentication Flow Architecture

### 1. Token Strategy: JWT + Refresh Token Rotation

We recommend **JWT tokens with refresh token rotation** over server sessions for the following reasons:

#### JWT Advantages for Next.js:
- **Stateless**: Perfect for serverless/edge deployments
- **Performance**: No database lookup for every request
- **Scalability**: Horizontal scaling without session affinity
- **SSR/SSG Compatible**: Works seamlessly with Next.js rendering strategies
- **API Integration**: Native support in NestJS backend

#### Token Lifecycle Design:

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Next.js Middleware
    participant A as Auth Service
    participant R as Redis
    participant D as Database

    Note over C,D: 1. Initial Login
    C->>A: Login (email/password)
    A->>D: Verify credentials
    A->>R: Store refresh token
    A->>C: Set JWT + Refresh (HttpOnly cookies)

    Note over C,D: 2. Authenticated Request
    C->>M: Request with JWT cookie
    M->>M: Verify JWT signature
    M->>M: Check expiration
    alt JWT Valid
        M->>C: Allow request
    else JWT Expired
        M->>A: Use refresh token
        A->>R: Validate refresh token
        A->>A: Generate new JWT + Refresh
        A->>R: Store new refresh token
        A->>C: Set new cookies + Allow request
    end

    Note over C,D: 3. Logout
    C->>A: Logout request
    A->>R: Blacklist refresh token
    A->>C: Clear cookies
```

### 2. Cookie vs localStorage Strategy

**Recommendation: HttpOnly Cookies**

```typescript
// Cookie Configuration
const tokenConfig = {
  httpOnly: true,        // Prevent XSS access
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  path: '/',
  maxAge: 15 * 60,       // 15 minutes for JWT
};

const refreshConfig = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
```

### 3. OAuth 2.0/OpenID Connect Integration

```mermaid
graph LR
    subgraph "OAuth Flow"
        Client[Client]
        AuthServer[OAuth Provider]
        App[Next.js App]
        Backend[NestJS API]
    end

    Client -->|1. Initiate| App
    App -->|2. Redirect| AuthServer
    AuthServer -->|3. Callback| App
    App -->|4. Exchange code| Backend
    Backend -->|5. Get tokens| AuthServer
    Backend -->|6. Create session| Client
```

## System Components

### 1. Authentication Middleware Architecture

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, refreshToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  const refreshTokenValue = request.cookies.get('refresh-token')?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const payload = await verifyJWT(token);

    // Add user context to request headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role);

    return response;
  } catch (error) {
    if (error.name === 'TokenExpiredError' && refreshTokenValue) {
      try {
        const newTokens = await refreshToken(refreshTokenValue);
        const response = NextResponse.next();

        // Set new tokens
        response.cookies.set('auth-token', newTokens.accessToken, tokenConfig);
        response.cookies.set('refresh-token', newTokens.refreshToken, refreshConfig);

        return response;
      } catch (refreshError) {
        return redirectToLogin(request);
      }
    }

    return redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

### 2. Database Schema Extensions

```prisma
// Enhanced User model with authentication fields
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  name                  String
  password              String?  // Nullable for OAuth users
  avatar                String?
  role                  UserRole @default(MEMBER)
  emailVerified         DateTime?
  emailVerificationToken String?
  passwordResetToken    String?
  passwordResetExpires  DateTime?
  lastLogin             DateTime?
  isActive              Boolean  @default(true)
  failedLoginAttempts   Int      @default(0)
  lockoutUntil          DateTime?
  twoFactorEnabled      Boolean  @default(false)
  twoFactorSecret       String?
  workingHours          String?
  timeZone              String?
  notificationPrefs     String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // OAuth integrations
  oauthProviders        OAuthProvider[]

  // Sessions and security
  refreshTokens         RefreshToken[]
  loginHistory          LoginHistory[]

  // Existing relations...
  teamMemberships       TeamMember[]
  createdTeams          Team[]            @relation("TeamCreator")
  assignedTasks         Task[]            @relation("TaskAssignee")
  createdTasks          Task[]            @relation("TaskCreator")
  assignedStories       Story[]           @relation("StoryAssignee")
  createdStories        Story[]           @relation("StoryCreator")
  sprintComments        SprintComment[]
  storyComments         StoryComment[]
  retrospectiveItems    RetrospectiveItem[]
  actionItems           ActionItem[]      @relation("ActionItemAssignee")

  @@map("users")
}

model OAuthProvider {
  id            String   @id @default(cuid())
  provider      String   // 'google', 'github', 'microsoft'
  providerId    String   // User ID from OAuth provider
  email         String
  name          String?
  avatar        String?
  accessToken   String?  // Encrypted
  refreshToken  String?  // Encrypted
  expiresAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@unique([provider, userId]) // One account per provider per user
  @@map("oauth_providers")
}

model RefreshToken {
  id          String   @id @default(cuid())
  token       String   @unique
  deviceInfo  String?  // Browser/device identification
  ipAddress   String?
  userAgent   String?
  expiresAt   DateTime
  isRevoked   Boolean  @default(false)
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model LoginHistory {
  id          String   @id @default(cuid())
  ipAddress   String
  userAgent   String?
  location    String?  // Derived from IP
  success     Boolean
  failureReason String?
  timestamp   DateTime @default(now())

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("login_history")
}

model SecurityEvent {
  id          String   @id @default(cuid())
  type        SecurityEventType
  description String
  severity    SecuritySeverity
  ipAddress   String?
  userAgent   String?
  metadata    Json?    // Additional event data
  resolved    Boolean  @default(false)
  resolvedAt  DateTime?
  timestamp   DateTime @default(now())

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("security_events")
}

enum SecurityEventType {
  FAILED_LOGIN
  ACCOUNT_LOCKOUT
  PASSWORD_RESET_REQUEST
  SUSPICIOUS_ACTIVITY
  TOKEN_THEFT_DETECTED
  UNUSUAL_LOCATION
}

enum SecuritySeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### 3. API Route Protection Patterns

```typescript
// lib/auth/withAuth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJWT } from './jwt';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  options: {
    requiredRole?: string[];
    requireEmailVerified?: boolean;
  } = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.cookies['auth-token'];

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const payload = await verifyJWT(token);

      // Role-based access control
      if (options.requiredRole && !options.requiredRole.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Email verification check
      if (options.requireEmailVerified && !payload.emailVerified) {
        return res.status(403).json({ error: 'Email verification required' });
      }

      (req as AuthenticatedRequest).user = payload;
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Usage example
export default withAuth(
  async (req, res) => {
    // Handler code with authenticated user
    const { user } = req;
    // ...
  },
  { requiredRole: ['ADMIN', 'SCRUM_MASTER'] }
);
```

### 4. Client-Side Auth State Management

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: string[];
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Initialize auth state from server
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const user = await response.json();
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      throw error;
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    dispatch({ type: 'LOGOUT' });
  };

  const checkPermission = (permission: string) => {
    return state.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      refreshAuth,
      checkPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## Integration Points

### 1. Next.js Middleware Integration

```typescript
// middleware.ts - Production-ready implementation
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route categorization
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const apiAuthRoutes = ['/api/auth'];
  const protectedRoutes = ['/dashboard', '/projects', '/teams'];

  // Skip authentication for public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle authentication
  const authResult = await authenticateRequest(request);

  if (authResult.success) {
    const response = NextResponse.next();

    // Add user context to headers for API routes
    response.headers.set('x-user-id', authResult.user.id);
    response.headers.set('x-user-role', authResult.user.role);
    response.headers.set('x-user-permissions', JSON.stringify(authResult.user.permissions));

    // Set new tokens if refreshed
    if (authResult.newTokens) {
      setCookies(response, authResult.newTokens);
    }

    return response;
  } else {
    // Redirect to login for protected routes
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

async function authenticateRequest(request: NextRequest) {
  const accessToken = request.cookies.get('access-token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;

  if (!accessToken) {
    return { success: false };
  }

  try {
    // Verify access token
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    return {
      success: true,
      user: payload as any
    };
  } catch (error) {
    // Token expired, try refresh
    if (refreshToken) {
      return await refreshTokens(refreshToken);
    }
    return { success: false };
  }
}

async function refreshTokens(refreshToken: string) {
  try {
    // Verify refresh token exists in Redis
    const userId = await redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      return { success: false };
    }

    // Generate new tokens
    const newAccessToken = await new SignJWT({ userId, iat: Date.now() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(JWT_SECRET);

    const newRefreshToken = generateSecureToken();

    // Store new refresh token
    await redis.setex(`refresh:${newRefreshToken}`, 7 * 24 * 60 * 60, userId);
    await redis.del(`refresh:${refreshToken}`);

    return {
      success: true,
      user: { userId },
      newTokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  } catch (error) {
    return { success: false };
  }
}
```

### 2. SSR/SSG Authentication Handling

```typescript
// lib/auth/serverAuth.ts
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';

export async function getServerSideAuth(context: GetServerSidePropsContext) {
  const { req } = context;
  const token = req.cookies['access-token'];

  if (!token) {
    return { authenticated: false };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      authenticated: true,
      user: payload,
    };
  } catch (error) {
    return { authenticated: false };
  }
}

// Usage in pages
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const auth = await getServerSideAuth(context);

  if (!auth.authenticated) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: auth.user,
    },
  };
}
```

### 3. WebSocket Authentication

```typescript
// lib/websocket/auth.ts
import { Server } from 'socket.io';
import { verifyJWT } from '../auth/jwt';

export function setupWebSocketAuth(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                   socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = await verifyJWT(token);
      socket.userId = payload.userId;
      socket.userRole = payload.role;

      // Join user-specific room for notifications
      socket.join(`user:${payload.userId}`);

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
}
```

## Security Considerations

### 1. Token Security

```typescript
// lib/auth/security.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';

// Secure token generation
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Account lockout after failed attempts
export async function handleFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const failedAttempts = user.failedLoginAttempts + 1;

  const updates: any = { failedLoginAttempts: failedAttempts };

  // Lock account after 5 failed attempts
  if (failedAttempts >= 5) {
    updates.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  await prisma.user.update({
    where: { id: userId },
    data: updates,
  });
}
```

### 2. XSS and CSRF Protection

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

## Scalability Architecture

### 1. Redis Session Storage

```typescript
// lib/redis/sessionStore.ts
import { Redis } from 'ioredis';

class SessionStore {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  async storeRefreshToken(userId: string, token: string, deviceInfo: any) {
    const key = `refresh:${token}`;
    const value = JSON.stringify({ userId, deviceInfo, createdAt: Date.now() });
    await this.redis.setex(key, 7 * 24 * 60 * 60, value); // 7 days
  }

  async validateRefreshToken(token: string): Promise<any> {
    const key = `refresh:${token}`;
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async revokeRefreshToken(token: string) {
    await this.redis.del(`refresh:${token}`);
  }

  async revokeAllUserTokens(userId: string) {
    const pattern = 'refresh:*';
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const data = JSON.parse(value);
        if (data.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }

  // Session blacklisting for immediate logout
  async blacklistToken(jti: string, expiresAt: number) {
    const ttl = Math.max(0, expiresAt - Date.now() / 1000);
    await this.redis.setex(`blacklist:${jti}`, ttl, '1');
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${jti}`);
    return result === '1';
  }
}

export const sessionStore = new SessionStore();
```

### 2. Rate Limiting Architecture

```typescript
// lib/rateLimit/index.ts
import { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export class RateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const window = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${window}`;

    const current = await this.redis.incr(windowKey);

    if (current === 1) {
      await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }

    const allowed = current <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - current);
    const resetTime = (window + 1) * config.windowMs;

    return { allowed, remaining, resetTime };
  }
}

// Different rate limits for different operations
export const rateLimits = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
};
```

### 3. Multi-Device Session Management

```typescript
// lib/auth/deviceManager.ts
interface DeviceSession {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  refreshToken: string;
  lastUsed: Date;
  createdAt: Date;
}

export class DeviceManager {
  async createSession(userId: string, deviceInfo: any): Promise<DeviceSession> {
    // Limit to 5 active sessions per user
    await this.enforceSessionLimit(userId, 5);

    const session = await prisma.refreshToken.create({
      data: {
        userId,
        token: generateSecureToken(),
        deviceInfo: JSON.stringify(deviceInfo),
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return session;
  }

  async enforceSessionLimit(userId: string, maxSessions: number) {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'asc' },
    });

    if (sessions.length >= maxSessions) {
      const toRevoke = sessions.slice(0, sessions.length - maxSessions + 1);
      await prisma.refreshToken.updateMany({
        where: { id: { in: toRevoke.map(s => s.id) } },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }
  }

  async getActiveSessions(userId: string): Promise<DeviceSession[]> {
    return prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    await prisma.refreshToken.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}
```

## Implementation Guidelines

### 1. Environment Configuration

```bash
# .env.local
# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-key
AUTH_COOKIE_DOMAIN=localhost
AUTH_COOKIE_SECURE=false # true in production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/scrumboard

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional-password

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=redis://localhost:6379
```

### 2. Security Checklist

- [ ] JWT secrets are cryptographically secure (256-bit minimum)
- [ ] HttpOnly cookies with Secure and SameSite flags
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after failed login attempts
- [ ] Password strength requirements (min 8 chars, complexity)
- [ ] Email verification for new accounts
- [ ] Secure password reset flow with time-limited tokens
- [ ] Session invalidation on password change
- [ ] HTTPS enforcement in production
- [ ] Content Security Policy headers
- [ ] Input validation and sanitization
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS protection headers
- [ ] CSRF protection for state-changing operations

### 3. Performance Optimizations

```typescript
// lib/auth/optimizations.ts

// JWT payload optimization
interface JWTPayload {
  sub: string;     // user ID
  rol: string;     // role
  per: string[];   // permissions (abbreviated)
  iat: number;     // issued at
  exp: number;     // expires at
  jti: string;     // JWT ID for blacklisting
}

// Efficient permission checking
const PERMISSION_CACHE = new Map<string, string[]>();

export function getUserPermissions(userId: string, role: string): string[] {
  const cacheKey = `${userId}:${role}`;

  if (PERMISSION_CACHE.has(cacheKey)) {
    return PERMISSION_CACHE.get(cacheKey)!;
  }

  const permissions = calculatePermissions(role);
  PERMISSION_CACHE.set(cacheKey, permissions);

  // Cache invalidation after 5 minutes
  setTimeout(() => PERMISSION_CACHE.delete(cacheKey), 5 * 60 * 1000);

  return permissions;
}

// Batch token verification for API routes
export async function batchVerifyTokens(tokens: string[]): Promise<any[]> {
  return Promise.all(tokens.map(token => verifyJWT(token).catch(() => null)));
}
```

## Monitoring and Observability

### 1. Authentication Metrics

```typescript
// lib/monitoring/authMetrics.ts
interface AuthMetrics {
  successfulLogins: number;
  failedLogins: number;
  accountLockouts: number;
  passwordResets: number;
  suspiciousActivity: number;
  activeUserSessions: number;
}

export class AuthMonitoring {
  async recordLoginAttempt(success: boolean, userId?: string, ip?: string) {
    await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: ip || 'unknown',
        success,
        failureReason: success ? null : 'Invalid credentials',
        timestamp: new Date(),
      },
    });

    // Real-time alerting for suspicious patterns
    if (!success) {
      await this.checkSuspiciousActivity(ip);
    }
  }

  async checkSuspiciousActivity(ip: string) {
    const recentFailures = await prisma.loginHistory.count({
      where: {
        ipAddress: ip,
        success: false,
        timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (recentFailures >= 10) {
      await this.triggerSecurityAlert('BRUTE_FORCE_DETECTED', { ip, attempts: recentFailures });
    }
  }

  async getAuthMetrics(timeframe: 'hour' | 'day' | 'week'): Promise<AuthMetrics> {
    const since = new Date();
    switch (timeframe) {
      case 'hour': since.setHours(since.getHours() - 1); break;
      case 'day': since.setDate(since.getDate() - 1); break;
      case 'week': since.setDate(since.getDate() - 7); break;
    }

    const [successful, failed, lockouts, resets] = await Promise.all([
      prisma.loginHistory.count({ where: { success: true, timestamp: { gte: since } } }),
      prisma.loginHistory.count({ where: { success: false, timestamp: { gte: since } } }),
      prisma.user.count({ where: { lockoutUntil: { not: null } } }),
      prisma.user.count({ where: { passwordResetToken: { not: null } } }),
    ]);

    return {
      successfulLogins: successful,
      failedLogins: failed,
      accountLockouts: lockouts,
      passwordResets: resets,
      suspiciousActivity: 0, // Calculate from security events
      activeUserSessions: await this.getActiveSessionCount(),
    };
  }
}
```

### 2. Health Checks

```typescript
// pages/api/health/auth.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check database connectivity
    await prisma.user.findFirst();

    // Check Redis connectivity
    await redis.ping();

    // Check JWT signing
    const testToken = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1m')
      .sign(JWT_SECRET);

    await jwtVerify(testToken, JWT_SECRET);

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok',
        jwt: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

This comprehensive authentication architecture provides a robust, scalable, and secure foundation for the Scrum board application while maintaining the flexibility needed for future enhancements and integrations.
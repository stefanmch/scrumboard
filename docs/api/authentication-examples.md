# Authentication API Examples

This document provides practical code examples for integrating with the Scrumboard Authentication API using various methods and programming languages.

## Table of Contents

1. [cURL Examples](#curl-examples)
2. [JavaScript/TypeScript Examples](#javascripttypescript-examples)
3. [Axios Examples](#axios-examples)
4. [Common Workflows](#common-workflows)
5. [Error Handling](#error-handling)
6. [Token Storage Best Practices](#token-storage-best-practices)
7. [Frontend Integration Patterns](#frontend-integration-patterns)

## cURL Examples

### 1. User Registration

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123",
    "name": "Jane Developer",
    "role": "DEVELOPER"
  }'
```

### 2. User Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: MyApp/1.0" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123"
  }'
```

### 3. Get Current User

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

### 6. Email Verification

```bash
curl -X POST http://localhost:3001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "email-verification-token"
  }'
```

### 7. Forgot Password

```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com"
  }'
```

### 8. Reset Password

```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "password-reset-token",
    "newPassword": "newsecurepassword123"
  }'
```

### 9. Change Password

```bash
curl -X POST http://localhost:3001/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "currentPassword": "securepassword123",
    "newPassword": "newsecurepassword123"
  }'
```

### 10. Get User Sessions

```bash
curl -X GET http://localhost:3001/auth/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 11. Revoke Session

```bash
curl -X DELETE http://localhost:3001/auth/sessions/session-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## JavaScript/TypeScript Examples

### Basic Fetch API Implementation

```typescript
// types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SCRUM_MASTER' | 'PRODUCT_OWNER' | 'DEVELOPER' | 'STAKEHOLDER' | 'MEMBER';
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// auth-api.ts
const API_BASE_URL = 'http://localhost:3001';

class AuthAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<User> {
    return this.makeRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'User-Agent': navigator.userAgent,
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    return this.makeRequest<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: {
        'User-Agent': navigator.userAgent,
      },
    });
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    return this.makeRequest<void>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(accessToken: string): Promise<User> {
    return this.makeRequest<User>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(
    accessToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getSessions(accessToken: string): Promise<any[]> {
    return this.makeRequest<any[]>('/auth/sessions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async revokeSession(accessToken: string, sessionId: string): Promise<void> {
    return this.makeRequest<void>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

export const authAPI = new AuthAPI();
```

### Usage Examples

```typescript
// Example usage
async function loginExample() {
  try {
    const authResponse = await authAPI.login({
      email: 'developer@example.com',
      password: 'securepassword123',
    });

    console.log('Login successful:', authResponse.user);

    // Store tokens securely
    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('refreshToken', authResponse.refreshToken);

    return authResponse;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function getCurrentUserExample() {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const user = await authAPI.getCurrentUser(accessToken);
    console.log('Current user:', user);
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error.message);
    // Token might be expired, try refreshing
    await refreshTokenExample();
  }
}

async function refreshTokenExample() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const refreshResponse = await authAPI.refreshToken(refreshToken);

    // Update stored tokens
    localStorage.setItem('accessToken', refreshResponse.accessToken);
    localStorage.setItem('refreshToken', refreshResponse.refreshToken);

    return refreshResponse;
  } catch (error) {
    console.error('Token refresh failed:', error.message);
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Axios Examples

### Axios Configuration with Interceptors

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class AuthService {
  private api: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.performTokenRefresh();

    try {
      const accessToken = await this.refreshTokenPromise;
      return accessToken;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    return accessToken;
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', {
      email,
      password,
    });

    const { accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return response.data;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      await this.api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async getSessions() {
    const response = await this.api.get('/auth/sessions');
    return response.data;
  }

  async revokeSession(sessionId: string) {
    await this.api.delete(`/auth/sessions/${sessionId}`);
  }
}

export const authService = new AuthService();
```

## Common Workflows

### Complete Authentication Workflow

```typescript
// 1. Registration Flow
async function registerAndVerify() {
  try {
    // Step 1: Register user
    const user = await authAPI.register({
      email: 'newuser@example.com',
      password: 'securepassword123',
      name: 'New User',
      role: 'DEVELOPER'
    });

    console.log('User registered:', user);

    // Step 2: User receives email verification token
    // (In real app, this would come from email)
    const verificationToken = 'email-verification-token';

    // Step 3: Verify email
    const verificationResult = await authAPI.verifyEmail(verificationToken);
    console.log('Email verified:', verificationResult.message);

    return user;
  } catch (error) {
    console.error('Registration failed:', error.message);
    throw error;
  }
}

// 2. Login → Use API → Logout Flow
async function completeSessionFlow() {
  try {
    // Login
    const authResponse = await authAPI.login({
      email: 'user@example.com',
      password: 'securepassword123'
    });

    // Use authenticated endpoints
    const user = await authAPI.getCurrentUser(authResponse.accessToken);
    const sessions = await authAPI.getSessions(authResponse.accessToken);

    console.log('Current user:', user);
    console.log('Active sessions:', sessions);

    // Logout
    await authAPI.logout(authResponse.accessToken, authResponse.refreshToken);
    console.log('Logged out successfully');

  } catch (error) {
    console.error('Session flow failed:', error.message);
  }
}

// 3. Password Reset Flow
async function passwordResetFlow() {
  try {
    // Step 1: Request password reset
    const resetResult = await authAPI.forgotPassword('user@example.com');
    console.log(resetResult.message);

    // Step 2: User receives reset token via email
    // (In real app, this would come from email)
    const resetToken = 'password-reset-token';

    // Step 3: Reset password
    const resetPasswordResult = await authAPI.resetPassword(
      resetToken,
      'newsecurepassword123'
    );
    console.log(resetPasswordResult.message);

  } catch (error) {
    console.error('Password reset failed:', error.message);
  }
}
```

### React Hook for Authentication

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from './auth-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const currentUser = await authAPI.getCurrentUser(accessToken);
        setUser(currentUser);
      }
    } catch (error) {
      // Token might be expired, try refresh
      try {
        await refreshToken();
      } catch (refreshError) {
        // Refresh failed, clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const authResponse = await authAPI.login({ email, password });

    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('refreshToken', authResponse.refreshToken);

    setUser(authResponse.user);
  }

  async function logout() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
      await authAPI.logout(accessToken, refreshToken);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }

  async function refreshToken() {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('No refresh token');
    }

    const refreshResponse = await authAPI.refreshToken(refreshTokenValue);

    localStorage.setItem('accessToken', refreshResponse.accessToken);
    localStorage.setItem('refreshToken', refreshResponse.refreshToken);

    // Get updated user info
    const currentUser = await authAPI.getCurrentUser(refreshResponse.accessToken);
    setUser(currentUser);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
interface APIError {
  statusCode: number;
  message: string | string[];
  error: string;
}

class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleAuthRequest<T>(
  request: () => Promise<T>
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error.response) {
      const apiError: APIError = error.response.data;
      const message = Array.isArray(apiError.message)
        ? apiError.message.join(', ')
        : apiError.message;

      throw new AuthError(apiError.statusCode, message, error);
    }

    if (error.request) {
      throw new AuthError(0, 'Network error - please check your connection', error);
    }

    throw new AuthError(500, error.message || 'An unexpected error occurred', error);
  }
}

// Usage example with error handling
async function loginWithErrorHandling(email: string, password: string) {
  try {
    return await handleAuthRequest(() =>
      authAPI.login({ email, password })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.statusCode) {
        case 400:
          console.error('Validation error:', error.message);
          break;
        case 401:
          console.error('Invalid credentials:', error.message);
          break;
        case 423:
          console.error('Account locked:', error.message);
          break;
        case 429:
          console.error('Too many requests:', error.message);
          break;
        default:
          console.error('Login error:', error.message);
      }
    }
    throw error;
  }
}
```

## Token Storage Best Practices

### Secure Token Storage Options

```typescript
// 1. In-Memory Storage (Most Secure)
class InMemoryTokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// 2. Secure Cookie Storage (Recommended for web apps)
class CookieTokenStorage {
  setTokens(accessToken: string, refreshToken: string) {
    // Access token in memory or short-lived cookie
    document.cookie = `accessToken=${accessToken}; path=/; max-age=900; secure; samesite=strict`;

    // Refresh token in HttpOnly cookie (backend sets this)
    // This should be handled by the backend after login
  }

  getAccessToken(): string | null {
    const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  clearTokens() {
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    // Refresh token clearing should be handled by backend
  }
}

// 3. Local Storage with Encryption (Fallback option)
class EncryptedLocalStorage {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  private encrypt(text: string): string {
    // Implement encryption (e.g., using crypto-js)
    // This is a simplified example
    return btoa(text);
  }

  private decrypt(encryptedText: string): string {
    // Implement decryption
    return atob(encryptedText);
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('at', this.encrypt(accessToken));
    localStorage.setItem('rt', this.encrypt(refreshToken));
  }

  getAccessToken(): string | null {
    const encrypted = localStorage.getItem('at');
    return encrypted ? this.decrypt(encrypted) : null;
  }

  getRefreshToken(): string | null {
    const encrypted = localStorage.getItem('rt');
    return encrypted ? this.decrypt(encrypted) : null;
  }

  clearTokens() {
    localStorage.removeItem('at');
    localStorage.removeItem('rt');
  }
}
```

### Token Management Service

```typescript
interface TokenStorage {
  setTokens(accessToken: string, refreshToken: string): void;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  clearTokens(): void;
}

class TokenManager {
  private storage: TokenStorage;
  private refreshPromise: Promise<string> | null = null;

  constructor(storage: TokenStorage) {
    this.storage = storage;
  }

  async getValidAccessToken(): Promise<string | null> {
    let accessToken = this.storage.getAccessToken();

    if (!accessToken) {
      return null;
    }

    // Check if token is about to expire (JWT parsing)
    if (this.isTokenExpiringSoon(accessToken)) {
      try {
        accessToken = await this.refreshAccessToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.storage.clearTokens();
        return null;
      }
    }

    return accessToken;
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      return expirationTime - currentTime < fiveMinutes;
    } catch (error) {
      return true; // Assume expired if we can't parse
    }
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshResponse = await authAPI.refreshToken(refreshToken);

    this.storage.setTokens(
      refreshResponse.accessToken,
      refreshResponse.refreshToken
    );

    return refreshResponse.accessToken;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.storage.setTokens(accessToken, refreshToken);
  }

  clearTokens() {
    this.storage.clearTokens();
  }
}

// Usage
const tokenManager = new TokenManager(new InMemoryTokenStorage());
// or
// const tokenManager = new TokenManager(new CookieTokenStorage());
```

## Frontend Integration Patterns

### Route Protection

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage in router
function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Login Form Component

```tsx
import React, { useState } from 'react';
import { useAuth } from './auth-context';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

This comprehensive examples documentation provides practical, production-ready code samples for integrating with the Scrumboard Authentication API using various approaches and frameworks.
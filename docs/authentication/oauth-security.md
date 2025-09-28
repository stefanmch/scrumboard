# OAuth Security Best Practices

## Overview

This document outlines comprehensive security best practices for OAuth 2.0 and social login implementations in the Scrum board application. It covers common vulnerabilities, security measures, and protective strategies to ensure secure authentication flows.

## Table of Contents

1. [OAuth Security Fundamentals](#oauth-security-fundamentals)
2. [Common Vulnerabilities](#common-vulnerabilities)
3. [CSRF Protection](#csrf-protection)
4. [Token Security](#token-security)
5. [Provider-Specific Security](#provider-specific-security)
6. [Implementation Security](#implementation-security)
7. [Monitoring and Detection](#monitoring-and-detection)
8. [Security Testing](#security-testing)

## OAuth Security Fundamentals

### Core Security Principles

```typescript
// lib/auth/security-principles.ts
export const OAuthSecurityPrinciples = {
  // Principle of Least Privilege
  minimizeScopes: (requiredFeatures: string[]) => {
    const scopeMapping = {
      'basic-profile': ['read:user', 'user:email'],
      'team-integration': ['read:user', 'user:email', 'read:org'],
      'repository-access': ['read:user', 'user:email', 'repo:status']
    };

    return requiredFeatures.flatMap(feature => scopeMapping[feature] || []);
  },

  // Defense in Depth
  multiLayerValidation: {
    clientSide: ['state parameter', 'redirect URI validation'],
    serverSide: ['token validation', 'signature verification', 'audience validation'],
    application: ['user authorization', 'session management', 'rate limiting']
  },

  // Zero Trust Architecture
  trustNoRequest: {
    validateEveryRequest: true,
    verifyTokens: true,
    checkPermissions: true,
    logSecurityEvents: true
  }
} as const;
```

### Security Headers Configuration

```typescript
// lib/auth/security-headers.ts
export class SecurityHeaders {
  static getOAuthHeaders(): Record<string, string> {
    return {
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',

      // Prevent MIME sniffing
      'X-Content-Type-Options': 'nosniff',

      // XSS Protection
      'X-XSS-Protection': '1; mode=block',

      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://accounts.google.com https://github.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.github.com https://graph.microsoft.com",
        "frame-ancestors 'none'"
      ].join('; '),

      // HSTS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

      // Permissions Policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  static applyToResponse(res: NextApiResponse) {
    const headers = this.getOAuthHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}
```

## Common Vulnerabilities

### 1. Authorization Code Interception

```typescript
// lib/auth/code-interception-protection.ts
export class CodeInterceptionProtection {
  // PKCE (Proof Key for Code Exchange) Implementation
  static generatePKCE(): { codeVerifier: string; codeChallenge: string; codeChallengeMethod: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  // Validate PKCE on callback
  static validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
    const computedChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return crypto.timingSafeEqual(
      Buffer.from(computedChallenge),
      Buffer.from(codeChallenge)
    );
  }

  // Short-lived authorization codes
  static isCodeExpired(codeTimestamp: number, maxAgeMinutes: number = 10): boolean {
    const ageMs = Date.now() - codeTimestamp;
    return ageMs > maxAgeMinutes * 60 * 1000;
  }
}
```

### 2. Redirect URI Manipulation

```typescript
// lib/auth/redirect-validation.ts
export class RedirectURIValidator {
  private static allowedRedirectURIs = new Set([
    'http://localhost:3000/api/auth/callback/google',
    'http://localhost:3000/api/auth/callback/github',
    'https://your-domain.com/api/auth/callback/google',
    'https://your-domain.com/api/auth/callback/github',
    'https://staging.your-domain.com/api/auth/callback/google',
    'https://staging.your-domain.com/api/auth/callback/github'
  ]);

  static validateRedirectURI(uri: string): boolean {
    try {
      const url = new URL(uri);

      // Check against allowed URIs
      if (!this.allowedRedirectURIs.has(uri)) {
        console.warn(`Invalid redirect URI: ${uri}`);
        return false;
      }

      // Additional validation rules
      return this.validateURLStructure(url);
    } catch (error) {
      console.error('Redirect URI validation error:', error);
      return false;
    }
  }

  private static validateURLStructure(url: URL): boolean {
    // Must use HTTPS in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return false;
    }

    // No suspicious query parameters
    const suspiciousParams = ['javascript:', 'data:', 'vbscript:'];
    const queryString = url.search.toLowerCase();

    return !suspiciousParams.some(param => queryString.includes(param));
  }

  static sanitizeRedirectURI(uri: string): string {
    try {
      const url = new URL(uri);

      // Remove potentially dangerous parameters
      url.searchParams.delete('javascript');
      url.searchParams.delete('data');
      url.hash = ''; // Remove fragment

      return url.toString();
    } catch (error) {
      throw new Error('Invalid redirect URI format');
    }
  }
}
```

### 3. Token Theft and Replay Attacks

```typescript
// lib/auth/token-security.ts
export class TokenSecurity {
  // Secure token storage with encryption
  static encryptToken(token: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  static decryptToken(encryptedData: string, key: string): string {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData);
    const algorithm = 'aes-256-gcm';

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Token binding to prevent replay attacks
  static bindTokenToClient(token: string, clientFingerprint: string): string {
    const binding = crypto
      .createHash('sha256')
      .update(token + clientFingerprint)
      .digest('hex');

    return `${token}.${binding}`;
  }

  static validateTokenBinding(boundToken: string, clientFingerprint: string): boolean {
    const [token, binding] = boundToken.split('.');
    const expectedBinding = crypto
      .createHash('sha256')
      .update(token + clientFingerprint)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(binding, 'hex'),
      Buffer.from(expectedBinding, 'hex')
    );
  }

  // Token rotation strategy
  static shouldRotateToken(tokenAge: number, lastUsed: number): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const inactivityThreshold = 2 * 60 * 60 * 1000; // 2 hours

    return tokenAge > maxAge || (Date.now() - lastUsed) > inactivityThreshold;
  }
}
```

## CSRF Protection

### State Parameter Implementation

```typescript
// lib/auth/csrf-protection.ts
export class CSRFProtection {
  // Generate cryptographically secure state parameter
  static generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Store state with expiration
  static storeState(state: string, sessionId: string, expirationMinutes: number = 10): void {
    const expiration = Date.now() + (expirationMinutes * 60 * 1000);

    // Store in secure session storage or database
    stateStorage.set(state, {
      sessionId,
      expiration,
      used: false
    });
  }

  // Validate state parameter
  static validateState(state: string, sessionId: string): boolean {
    const stateData = stateStorage.get(state);

    if (!stateData) {
      console.warn('State parameter not found:', state);
      return false;
    }

    if (stateData.used) {
      console.warn('State parameter already used:', state);
      return false;
    }

    if (Date.now() > stateData.expiration) {
      console.warn('State parameter expired:', state);
      stateStorage.delete(state);
      return false;
    }

    if (stateData.sessionId !== sessionId) {
      console.warn('State parameter session mismatch:', state);
      return false;
    }

    // Mark as used to prevent replay
    stateData.used = true;
    stateStorage.set(state, stateData);

    return true;
  }

  // Clean up expired states
  static cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of stateStorage.entries()) {
      if (now > data.expiration) {
        stateStorage.delete(state);
      }
    }
  }
}

// In-memory state storage (use Redis in production)
const stateStorage = new Map<string, {
  sessionId: string;
  expiration: number;
  used: boolean;
}>();
```

### Double Submit Cookie Pattern

```typescript
// lib/auth/double-submit-cookie.ts
export class DoubleSubmitCookie {
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static setCSRFCookie(res: NextApiResponse, token: string): void {
    res.setHeader('Set-Cookie', [
      `csrf-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`,
      `csrf-token-readable=${token}; Secure; SameSite=Strict; Path=/`
    ]);
  }

  static validateCSRFToken(req: NextApiRequest): boolean {
    const cookieToken = this.getTokenFromCookie(req);
    const headerToken = req.headers['x-csrf-token'] as string;
    const bodyToken = req.body?.csrfToken;

    const submittedToken = headerToken || bodyToken;

    if (!cookieToken || !submittedToken) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(submittedToken)
    );
  }

  private static getTokenFromCookie(req: NextApiRequest): string | null {
    const cookies = req.headers.cookie;
    if (!cookies) return null;

    const match = cookies.match(/csrf-token=([^;]+)/);
    return match ? match[1] : null;
  }
}
```

## Token Security

### JWT Validation

```typescript
// lib/auth/jwt-validation.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export class JWTValidator {
  private static jwksClients = new Map<string, jwksClient.JwksClient>();

  static async validateJWT(token: string, issuer: string, audience: string): Promise<any> {
    try {
      // Get JWKS client for issuer
      const client = this.getJWKSClient(issuer);

      // Decode token header to get key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      const kid = decoded.header.kid;
      if (!kid) {
        throw new Error('Token missing key ID');
      }

      // Get signing key
      const key = await this.getSigningKey(client, kid);

      // Verify token
      const payload = jwt.verify(token, key, {
        issuer,
        audience,
        algorithms: ['RS256', 'ES256'],
        clockTolerance: 60 // 60 seconds clock skew tolerance
      });

      return payload;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw error;
    }
  }

  private static getJWKSClient(issuer: string): jwksClient.JwksClient {
    if (!this.jwksClients.has(issuer)) {
      const client = jwksClient({
        jwksUri: `${issuer}/.well-known/jwks.json`,
        requestHeaders: {},
        timeout: 30000,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksRequestsPerMinuteMax: 100
      });

      this.jwksClients.set(issuer, client);
    }

    return this.jwksClients.get(issuer)!;
  }

  private static async getSigningKey(client: jwksClient.JwksClient, kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      client.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else {
          const signingKey = key!.getPublicKey();
          resolve(signingKey);
        }
      });
    });
  }

  // Validate token claims
  static validateTokenClaims(payload: any): boolean {
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      console.warn('Token expired');
      return false;
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      console.warn('Token not yet valid');
      return false;
    }

    // Check issued at (prevent tokens issued in the future)
    if (payload.iat && payload.iat > now + 60) {
      console.warn('Token issued in the future');
      return false;
    }

    return true;
  }
}
```

### Token Storage Security

```typescript
// lib/auth/token-storage.ts
export class SecureTokenStorage {
  // Client-side token storage (avoid localStorage for sensitive tokens)
  static storeInSecureHttpOnlyCookie(res: NextApiResponse, token: string, options: {
    name: string;
    maxAge: number;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
  }): void {
    const { name, maxAge, sameSite = 'strict', secure = true } = options;

    const cookieValue = [
      `${name}=${token}`,
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'Path=/',
      `SameSite=${sameSite}`,
      secure ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieValue);
  }

  // Server-side token encryption
  static encryptTokenForStorage(token: string): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY!;
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('oauth-token'));

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  static decryptTokenFromStorage(encryptedToken: string): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY!;
    const algorithm = 'aes-256-gcm';

    const [ivHex, encrypted, authTagHex] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('oauth-token'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Token database storage with encryption
  static async storeTokenInDatabase(userId: string, tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    provider: string;
  }): Promise<void> {
    const encryptedAccess = this.encryptTokenForStorage(tokenData.accessToken);
    const encryptedRefresh = tokenData.refreshToken
      ? this.encryptTokenForStorage(tokenData.refreshToken)
      : null;

    await database.tokens.create({
      userId,
      provider: tokenData.provider,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: tokenData.expiresAt,
      createdAt: new Date()
    });
  }
}
```

## Provider-Specific Security

### Google OAuth Security

```typescript
// lib/auth/providers/google-security.ts
export class GoogleOAuthSecurity {
  // Validate Google ID token
  static async validateGoogleIdToken(idToken: string): Promise<any> {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      // Additional Google-specific validations
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Invalid audience');
      }

      if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
        throw new Error('Invalid issuer');
      }

      return payload;
    } catch (error) {
      console.error('Google ID token validation failed:', error);
      throw error;
    }
  }

  // Google Workspace domain restriction
  static validateGoogleWorkspaceDomain(profile: any): boolean {
    const allowedDomains = process.env.GOOGLE_ALLOWED_DOMAINS?.split(',') || [];

    if (allowedDomains.length === 0) {
      return true; // No domain restriction
    }

    const userDomain = profile.hd; // Hosted domain claim
    return allowedDomains.includes(userDomain);
  }

  // Validate Google OAuth state with PKCE
  static validateGoogleOAuthWithPKCE(authCode: string, codeVerifier: string): boolean {
    // Implementation depends on Google's PKCE support
    return CodeInterceptionProtection.validatePKCE(codeVerifier, authCode);
  }
}
```

### GitHub OAuth Security

```typescript
// lib/auth/providers/github-security.ts
export class GitHubOAuthSecurity {
  // Validate GitHub OAuth state
  static validateGitHubState(receivedState: string, expectedState: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(receivedState),
      Buffer.from(expectedState)
    );
  }

  // GitHub organization restriction
  static async validateGitHubOrganization(accessToken: string): Promise<boolean> {
    const allowedOrgs = process.env.GITHUB_ALLOWED_ORGS?.split(',') || [];

    if (allowedOrgs.length === 0) {
      return true; // No organization restriction
    }

    try {
      const response = await fetch('https://api.github.com/user/orgs', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const organizations = await response.json();
      const userOrgs = organizations.map(org => org.login);

      return allowedOrgs.some(org => userOrgs.includes(org));
    } catch (error) {
      console.error('GitHub organization validation failed:', error);
      return false;
    }
  }

  // Validate GitHub webhook signatures
  static validateWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.GITHUB_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`),
      Buffer.from(signature)
    );
  }
}
```

### Microsoft OAuth Security

```typescript
// lib/auth/providers/microsoft-security.ts
export class MicrosoftOAuthSecurity {
  // Validate Microsoft tenant
  static validateMicrosoftTenant(profile: any): boolean {
    const allowedTenants = process.env.MICROSOFT_ALLOWED_TENANTS?.split(',') || [];

    if (allowedTenants.length === 0) {
      return true; // No tenant restriction
    }

    const userTenant = profile.tid;
    return allowedTenants.includes(userTenant);
  }

  // Validate conditional access
  static validateConditionalAccess(idToken: any): boolean {
    // Check authentication method reference
    const amr = idToken.amr || [];

    // Require MFA if configured
    if (process.env.MICROSOFT_REQUIRE_MFA === 'true') {
      return amr.includes('mfa');
    }

    return true;
  }

  // Validate Azure AD groups
  static validateAzureADGroups(profile: any): boolean {
    const requiredGroups = process.env.MICROSOFT_REQUIRED_GROUPS?.split(',') || [];

    if (requiredGroups.length === 0) {
      return true; // No group requirement
    }

    const userGroups = profile.groups || [];
    return requiredGroups.some(group => userGroups.includes(group));
  }
}
```

## Implementation Security

### Secure OAuth Flow Implementation

```typescript
// lib/auth/secure-oauth-flow.ts
export class SecureOAuthFlow {
  // Secure authorization initiation
  static async initiateOAuth(provider: string, options: {
    redirectUri: string;
    scopes: string[];
    additionalParams?: Record<string, string>;
  }): Promise<{
    authorizationUrl: string;
    state: string;
    codeVerifier?: string;
  }> {
    // Generate state for CSRF protection
    const state = CSRFProtection.generateState();

    // Generate PKCE parameters
    const pkce = CodeInterceptionProtection.generatePKCE();

    // Store state and PKCE verifier securely
    await this.storeOAuthSession(state, {
      provider,
      codeVerifier: pkce.codeVerifier,
      redirectUri: options.redirectUri,
      timestamp: Date.now()
    });

    // Build authorization URL
    const authUrl = new URL(this.getProviderAuthURL(provider));
    authUrl.searchParams.set('client_id', this.getClientId(provider));
    authUrl.searchParams.set('redirect_uri', options.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', options.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

    // Add additional parameters
    if (options.additionalParams) {
      Object.entries(options.additionalParams).forEach(([key, value]) => {
        authUrl.searchParams.set(key, value);
      });
    }

    return {
      authorizationUrl: authUrl.toString(),
      state,
      codeVerifier: pkce.codeVerifier
    };
  }

  // Secure callback handling
  static async handleOAuthCallback(query: {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }): Promise<any> {
    // Check for OAuth errors
    if (query.error) {
      throw new Error(`OAuth error: ${query.error} - ${query.error_description}`);
    }

    if (!query.code || !query.state) {
      throw new Error('Missing required OAuth parameters');
    }

    // Validate state
    const sessionData = await this.getOAuthSession(query.state);
    if (!sessionData) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Exchange code for tokens with PKCE
    const tokens = await this.exchangeCodeForTokens(
      sessionData.provider,
      query.code,
      sessionData.codeVerifier,
      sessionData.redirectUri
    );

    // Validate tokens
    await this.validateTokens(tokens, sessionData.provider);

    // Clean up session
    await this.cleanupOAuthSession(query.state);

    return tokens;
  }

  private static async storeOAuthSession(state: string, data: any): Promise<void> {
    // Store in secure session storage (Redis/Database)
    await sessionStorage.set(`oauth:${state}`, data, { ttl: 600 }); // 10 minutes
  }

  private static async getOAuthSession(state: string): Promise<any> {
    return await sessionStorage.get(`oauth:${state}`);
  }

  private static async cleanupOAuthSession(state: string): Promise<void> {
    await sessionStorage.delete(`oauth:${state}`);
  }
}
```

### Rate Limiting and Abuse Prevention

```typescript
// lib/auth/rate-limiting.ts
export class OAuthRateLimit {
  private static attempts = new Map<string, number[]>();

  // Rate limit OAuth attempts by IP
  static checkRateLimit(clientIP: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get attempts for this IP
    const ipAttempts = this.attempts.get(clientIP) || [];

    // Filter to current window
    const recentAttempts = ipAttempts.filter(timestamp => timestamp > windowStart);

    // Check if rate limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(clientIP, recentAttempts);

    return true;
  }

  // Progressive delay for failed attempts
  static getProgressiveDelay(failedAttempts: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    const delay = Math.min(baseDelay * Math.pow(2, failedAttempts - 1), maxDelay);
    return delay;
  }

  // Clean up old attempts
  static cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [ip, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(timestamp => now - timestamp < maxAge);

      if (recentAttempts.length === 0) {
        this.attempts.delete(ip);
      } else {
        this.attempts.set(ip, recentAttempts);
      }
    }
  }
}
```

## Monitoring and Detection

### Security Event Logging

```typescript
// lib/auth/security-logging.ts
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'oauth_success' | 'oauth_failure' | 'suspicious_activity' | 'token_misuse';
    provider?: string;
    userId?: string;
    clientIP: string;
    userAgent: string;
    details: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventId: crypto.randomUUID(),
      ...event
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY]', logEntry);
    }

    // Send to security monitoring system
    this.sendToMonitoring(logEntry);

    // Trigger alerts for high-risk events
    if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
      this.triggerSecurityAlert(logEntry);
    }
  }

  static logFailedOAuthAttempt(details: {
    provider: string;
    error: string;
    clientIP: string;
    userAgent: string;
  }): void {
    this.logSecurityEvent({
      type: 'oauth_failure',
      provider: details.provider,
      clientIP: details.clientIP,
      userAgent: details.userAgent,
      details: { error: details.error },
      riskLevel: 'medium'
    });
  }

  static logSuspiciousActivity(details: {
    activity: string;
    userId?: string;
    clientIP: string;
    userAgent: string;
    indicators: string[];
  }): void {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      userId: details.userId,
      clientIP: details.clientIP,
      userAgent: details.userAgent,
      details: {
        activity: details.activity,
        indicators: details.indicators
      },
      riskLevel: 'high'
    });
  }

  private static sendToMonitoring(logEntry: any): void {
    // Implementation depends on monitoring service
    // Examples: DataDog, Splunk, ELK Stack, etc.
  }

  private static triggerSecurityAlert(logEntry: any): void {
    // Implementation depends on alerting system
    // Examples: PagerDuty, Slack alerts, email notifications
  }
}
```

### Anomaly Detection

```typescript
// lib/auth/anomaly-detection.ts
export class AnomalyDetection {
  // Detect unusual login patterns
  static async detectLoginAnomalies(userId: string, loginData: {
    clientIP: string;
    userAgent: string;
    location?: string;
    timestamp: Date;
  }): Promise<{
    isAnomalous: boolean;
    riskScore: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Get user's login history
    const loginHistory = await this.getUserLoginHistory(userId, 30); // Last 30 days

    // Check for new IP address
    const knownIPs = new Set(loginHistory.map(login => login.clientIP));
    if (!knownIPs.has(loginData.clientIP)) {
      indicators.push('new_ip_address');
      riskScore += 30;
    }

    // Check for unusual time
    const loginHour = loginData.timestamp.getHours();
    const usualHours = this.getUsualLoginHours(loginHistory);
    if (!usualHours.includes(loginHour)) {
      indicators.push('unusual_time');
      riskScore += 20;
    }

    // Check for new user agent
    const knownUserAgents = new Set(loginHistory.map(login => login.userAgent));
    if (!knownUserAgents.has(loginData.userAgent)) {
      indicators.push('new_user_agent');
      riskScore += 25;
    }

    // Check for impossible travel
    if (loginHistory.length > 0) {
      const lastLogin = loginHistory[0];
      const timeDiff = loginData.timestamp.getTime() - lastLogin.timestamp.getTime();
      const possibleTravel = this.isPossibleTravel(
        lastLogin.location,
        loginData.location,
        timeDiff
      );

      if (!possibleTravel) {
        indicators.push('impossible_travel');
        riskScore += 50;
      }
    }

    // Check for rapid successive attempts
    const recentAttempts = loginHistory.filter(
      login => loginData.timestamp.getTime() - login.timestamp.getTime() < 5 * 60 * 1000
    );

    if (recentAttempts.length > 3) {
      indicators.push('rapid_attempts');
      riskScore += 40;
    }

    return {
      isAnomalous: riskScore > 50,
      riskScore,
      indicators
    };
  }

  private static async getUserLoginHistory(userId: string, days: number): Promise<any[]> {
    // Implementation would fetch from database
    return [];
  }

  private static getUsualLoginHours(loginHistory: any[]): number[] {
    // Analyze login history to determine usual hours
    const hourCounts = new Array(24).fill(0);

    loginHistory.forEach(login => {
      const hour = login.timestamp.getHours();
      hourCounts[hour]++;
    });

    // Return hours with significant activity (> 10% of total logins)
    const totalLogins = loginHistory.length;
    const threshold = totalLogins * 0.1;

    return hourCounts
      .map((count, hour) => ({ count, hour }))
      .filter(({ count }) => count > threshold)
      .map(({ hour }) => hour);
  }

  private static isPossibleTravel(location1?: string, location2?: string, timeDiffMs?: number): boolean {
    if (!location1 || !location2 || !timeDiffMs) {
      return true; // Cannot determine without location data
    }

    // Simplified implementation - would use actual geolocation distance calculation
    const maxSpeedKmh = 900; // Maximum reasonable travel speed (plane)
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // For demonstration - actual implementation would calculate distance
    const estimatedDistance = 1000; // km
    const requiredSpeed = estimatedDistance / timeDiffHours;

    return requiredSpeed <= maxSpeedKmh;
  }
}
```

## Security Testing

### OAuth Security Test Suite

```typescript
// __tests__/security/oauth-security.test.ts
describe('OAuth Security', () => {
  describe('CSRF Protection', () => {
    test('should reject requests without state parameter', async () => {
      const response = await request(app)
        .get('/api/auth/callback/google')
        .query({ code: 'test-code' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('state');
    });

    test('should reject requests with invalid state', async () => {
      const response = await request(app)
        .get('/api/auth/callback/google')
        .query({
          code: 'test-code',
          state: 'invalid-state'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid state');
    });

    test('should reject reused state parameters', async () => {
      const state = CSRFProtection.generateState();
      CSRFProtection.storeState(state, 'session-id');

      // First use - should succeed
      CSRFProtection.validateState(state, 'session-id');

      // Second use - should fail
      const isValid = CSRFProtection.validateState(state, 'session-id');
      expect(isValid).toBe(false);
    });
  });

  describe('Redirect URI Validation', () => {
    test('should accept valid redirect URIs', () => {
      const validURIs = [
        'https://your-domain.com/api/auth/callback/google',
        'http://localhost:3000/api/auth/callback/google'
      ];

      validURIs.forEach(uri => {
        expect(RedirectURIValidator.validateRedirectURI(uri)).toBe(true);
      });
    });

    test('should reject malicious redirect URIs', () => {
      const maliciousURIs = [
        'https://evil.com/steal-tokens',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'https://your-domain.com.evil.com/callback'
      ];

      maliciousURIs.forEach(uri => {
        expect(RedirectURIValidator.validateRedirectURI(uri)).toBe(false);
      });
    });
  });

  describe('Token Security', () => {
    test('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'test-access-token';
      const key = 'test-encryption-key';

      const encrypted = TokenSecurity.encryptToken(originalToken, key);
      const decrypted = TokenSecurity.decryptToken(encrypted, key);

      expect(decrypted).toBe(originalToken);
      expect(encrypted).not.toContain(originalToken);
    });

    test('should validate token binding', () => {
      const token = 'test-token';
      const clientFingerprint = 'client-fingerprint';

      const boundToken = TokenSecurity.bindTokenToClient(token, clientFingerprint);
      const isValid = TokenSecurity.validateTokenBinding(boundToken, clientFingerprint);

      expect(isValid).toBe(true);

      // Test with different fingerprint
      const isInvalid = TokenSecurity.validateTokenBinding(boundToken, 'different-fingerprint');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      const clientIP = '192.168.1.1';

      for (let i = 0; i < 5; i++) {
        expect(OAuthRateLimit.checkRateLimit(clientIP)).toBe(true);
      }
    });

    test('should block requests exceeding rate limit', () => {
      const clientIP = '192.168.1.2';

      // Exceed rate limit
      for (let i = 0; i < 6; i++) {
        OAuthRateLimit.checkRateLimit(clientIP);
      }

      expect(OAuthRateLimit.checkRateLimit(clientIP)).toBe(false);
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect login from new IP', async () => {
      const userId = 'test-user';
      const loginData = {
        clientIP: '1.2.3.4',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date()
      };

      // Mock login history with different IP
      jest.spyOn(AnomalyDetection as any, 'getUserLoginHistory')
        .mockResolvedValue([
          { clientIP: '5.6.7.8', timestamp: new Date() }
        ]);

      const result = await AnomalyDetection.detectLoginAnomalies(userId, loginData);

      expect(result.isAnomalous).toBe(true);
      expect(result.indicators).toContain('new_ip_address');
    });
  });
});
```

### Penetration Testing Checklist

```typescript
// Security testing checklist for OAuth implementation
export const OAuthSecurityChecklist = {
  csrfProtection: [
    'State parameter generation and validation',
    'Double submit cookie implementation',
    'SameSite cookie attributes',
    'Secure flag on cookies'
  ],

  redirectURIValidation: [
    'Exact match validation',
    'HTTPS enforcement in production',
    'Domain whitelist validation',
    'Fragment removal',
    'Parameter injection prevention'
  ],

  tokenSecurity: [
    'Token encryption at rest',
    'Secure token transmission',
    'Token binding to client',
    'Token rotation strategy',
    'Scope validation'
  ],

  rateLimiting: [
    'Per-IP rate limiting',
    'Per-user rate limiting',
    'Progressive delays',
    'Distributed rate limiting'
  ],

  monitoring: [
    'Security event logging',
    'Anomaly detection',
    'Failed attempt tracking',
    'Suspicious activity alerts'
  ],

  providerSpecific: [
    'Provider-specific validations',
    'Domain/organization restrictions',
    'Group/role validations',
    'Additional security claims'
  ]
};
```

## Common Security Pitfalls

### 1. Insufficient State Validation

```typescript
// ❌ BAD: Weak state validation
if (req.query.state === session.state) {
  // Process OAuth callback
}

// ✅ GOOD: Cryptographically secure state validation
if (CSRFProtection.validateState(req.query.state, session.id)) {
  // Process OAuth callback
}
```

### 2. Insecure Token Storage

```typescript
// ❌ BAD: Storing tokens in localStorage
localStorage.setItem('access_token', accessToken);

// ✅ GOOD: Secure HTTP-only cookies
SecureTokenStorage.storeInSecureHttpOnlyCookie(res, accessToken, {
  name: 'access_token',
  maxAge: 3600,
  sameSite: 'strict',
  secure: true
});
```

### 3. Missing Redirect URI Validation

```typescript
// ❌ BAD: No redirect URI validation
const redirectUri = req.query.redirect_uri;
res.redirect(redirectUri);

// ✅ GOOD: Strict redirect URI validation
if (RedirectURIValidator.validateRedirectURI(redirectUri)) {
  res.redirect(redirectUri);
} else {
  res.status(400).json({ error: 'Invalid redirect URI' });
}
```

### 4. Inadequate Error Handling

```typescript
// ❌ BAD: Exposing internal errors
catch (error) {
  res.status(500).json({ error: error.message });
}

// ✅ GOOD: Secure error handling
catch (error) {
  SecurityLogger.logSecurityEvent({
    type: 'oauth_failure',
    details: { error: error.message },
    // ... other details
  });

  res.status(400).json({ error: 'Authentication failed' });
}
```

## Security Maintenance

### Regular Security Reviews

```typescript
// lib/auth/security-maintenance.ts
export class SecurityMaintenance {
  // Regular security health checks
  static async performSecurityAudit(): Promise<{
    issues: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check certificate expiration
    if (this.areCertificatesExpiringSoon()) {
      issues.push('SSL certificates expiring within 30 days');
      recommendations.push('Renew SSL certificates');
    }

    // Check for outdated dependencies
    if (await this.hasOutdatedSecurityDependencies()) {
      issues.push('Outdated security dependencies detected');
      recommendations.push('Update security-related npm packages');
    }

    // Check configuration security
    if (this.hasInsecureConfiguration()) {
      issues.push('Insecure configuration detected');
      recommendations.push('Review and update security configuration');
    }

    const riskLevel = issues.length > 2 ? 'high' : issues.length > 0 ? 'medium' : 'low';

    return { issues, recommendations, riskLevel };
  }

  // Rotate secrets and keys
  static async rotateSecrets(): Promise<void> {
    // Rotate session secrets
    await this.rotateSessionSecret();

    // Rotate token encryption keys
    await this.rotateTokenEncryptionKey();

    // Update OAuth app credentials if needed
    await this.checkOAuthCredentials();
  }

  private static areCertificatesExpiringSoon(): boolean {
    // Implementation would check actual certificates
    return false;
  }

  private static async hasOutdatedSecurityDependencies(): Promise<boolean> {
    // Implementation would check npm audit or security advisories
    return false;
  }

  private static hasInsecureConfiguration(): boolean {
    // Check for common misconfigurations
    const checks = [
      process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https'),
      process.env.NEXTAUTH_SECRET?.length >= 32,
      process.env.TOKEN_ENCRYPTION_KEY?.length >= 32
    ];

    return checks.some(check => !check);
  }
}
```

## Conclusion

Implementing secure OAuth 2.0 authentication requires attention to multiple security layers:

1. **CSRF Protection**: Always use state parameters and additional CSRF tokens
2. **Token Security**: Encrypt tokens, use secure storage, implement rotation
3. **Validation**: Validate all inputs, redirect URIs, and provider responses
4. **Monitoring**: Log security events and detect anomalies
5. **Rate Limiting**: Prevent abuse with proper rate limiting
6. **Provider-Specific**: Implement provider-specific security measures
7. **Regular Maintenance**: Perform security audits and keep dependencies updated

Security is an ongoing process that requires constant vigilance and regular updates to address new threats and vulnerabilities.
# Google OAuth 2.0 Setup Guide

## Overview

This guide walks through setting up Google OAuth 2.0 authentication for the Scrum board application using Google Cloud Console and the Google Identity Platform.

## Prerequisites

- Google account with access to Google Cloud Console
- Scrum board application domain (for production)
- Basic understanding of OAuth 2.0 flow

## Step 1: Create Google Cloud Project

### 1.1 Access Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms of service if prompted

### 1.2 Create New Project

```bash
# Option 1: Using Web Console
1. Click "Select a project" dropdown at the top
2. Click "New Project"
3. Enter project name: "scrum-board-oauth"
4. Select organization (if applicable)
5. Click "Create"

# Option 2: Using gcloud CLI
gcloud projects create scrum-board-oauth --name="Scrum Board OAuth"
gcloud config set project scrum-board-oauth
```

## Step 2: Enable Google+ API

### 2.1 Enable Required APIs

```bash
# Using gcloud CLI
gcloud services enable googleapis.com
gcloud services enable plus.googleapis.com
gcloud services enable oauth2.googleapis.com

# Or via Web Console:
# 1. Go to "APIs & Services" > "Library"
# 2. Search for "Google+ API"
# 3. Click "Enable"
```

### 2.2 Verify API Status

```bash
gcloud services list --enabled --filter="name:plus.googleapis.com"
```

## Step 3: Configure OAuth Consent Screen

### 3.1 Access OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (for public apps)
3. Click "Create"

### 3.2 Fill Required Information

```yaml
App Information:
  App name: "Scrum Board Application"
  User support email: your-email@domain.com
  App logo: (optional, 120x120px PNG/JPG)

Developer Contact Information:
  Email addresses: your-email@domain.com

App Domain:
  Application home page: https://your-domain.com
  Application privacy policy: https://your-domain.com/privacy
  Application terms of service: https://your-domain.com/terms

Authorized Domains:
  - your-domain.com
  - localhost (for development)
```

### 3.3 Configure Scopes

```yaml
Scopes:
  - ../auth/userinfo.email
  - ../auth/userinfo.profile
  - openid

Scope Justification:
  "Required for user authentication and profile information in the Scrum board application"
```

### 3.4 Test Users (Development Only)

```yaml
Test Users:
  - developer1@yourdomain.com
  - developer2@yourdomain.com
  - qa-tester@yourdomain.com
```

## Step 4: Create OAuth 2.0 Credentials

### 4.1 Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"

### 4.2 Configure Client Settings

```yaml
Name: "Scrum Board Web Client"

Authorized JavaScript Origins:
  # Development
  - http://localhost:3000
  - http://127.0.0.1:3000

  # Staging
  - https://staging.your-domain.com

  # Production
  - https://your-domain.com

Authorized Redirect URIs:
  # Development
  - http://localhost:3000/api/auth/callback/google

  # Staging
  - https://staging.your-domain.com/api/auth/callback/google

  # Production
  - https://your-domain.com/api/auth/callback/google
```

### 4.3 Download Credentials

```bash
# Save the following from the credentials page:
Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Client Secret: GOCSPX-abc123def456ghi789jkl
```

## Step 5: Environment Configuration

### 5.1 Development Environment

```bash
# .env.local
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789jkl

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key
```

### 5.2 Production Environment

```bash
# .env.production
GOOGLE_CLIENT_ID=prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-production-secret
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

## Step 6: Implementation

### 6.1 NextAuth Provider Configuration

```typescript
// pages/api/auth/[...nextauth].ts
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Custom fields
          given_name: profile.given_name,
          family_name: profile.family_name,
          locale: profile.locale,
          email_verified: profile.email_verified
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Verify email is verified
      if (account?.provider === 'google') {
        return profile?.email_verified === true;
      }
      return true;
    }
  }
});
```

### 6.2 Custom Google OAuth Service

```typescript
// lib/auth/google-oauth.ts
export class GoogleOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserProfile(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

## Step 7: Advanced Configuration

### 7.1 Google Workspace Integration

```typescript
// For Google Workspace (G Suite) organizations
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile',
      hd: 'yourdomain.com', // Restrict to your domain
      prompt: 'consent'
    }
  }
})
```

### 7.2 Additional Scopes

```typescript
// Request additional Google API access
const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly', // Calendar access
  'https://www.googleapis.com/auth/drive.readonly',    // Drive access
];

GoogleProvider({
  authorization: {
    params: {
      scope: scopes.join(' '),
      access_type: 'offline'
    }
  }
})
```

### 7.3 Custom Claims and Groups

```typescript
// Handle Google Groups and custom claims
callbacks: {
  async jwt({ token, account, profile }) {
    if (account?.provider === 'google') {
      // Fetch user's Google Groups
      const groups = await fetchGoogleGroups(account.access_token);
      token.groups = groups;

      // Add custom claims
      token.domain = profile?.hd; // Hosted domain
      token.locale = profile?.locale;
    }
    return token;
  },

  async session({ session, token }) {
    session.user.groups = token.groups;
    session.user.domain = token.domain;
    return session;
  }
}
```

## Step 8: Testing

### 8.1 Development Testing

```typescript
// __tests__/auth/google-oauth.test.ts
describe('Google OAuth Integration', () => {
  test('should generate valid authorization URL', () => {
    const service = new GoogleOAuthService();
    const state = 'test-state-123';
    const authUrl = service.getAuthorizationUrl(state);

    expect(authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain(`client_id=${process.env.GOOGLE_CLIENT_ID}`);
    expect(authUrl).toContain(`state=${state}`);
  });

  test('should handle OAuth callback', async () => {
    // Mock the token exchange
    const mockCode = 'test-auth-code';

    // Test implementation
    expect(true).toBe(true);
  });
});
```

### 8.2 Manual Testing Steps

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Login Page**
   ```
   http://localhost:3000/auth/signin
   ```

3. **Click Google Login Button**
   - Should redirect to Google OAuth consent screen
   - Verify correct scopes are requested
   - Complete authorization flow

4. **Verify User Profile**
   - Check that user data is correctly retrieved
   - Verify session is established
   - Test logout functionality

## Step 9: Production Deployment

### 9.1 Domain Verification

```bash
# Verify domain ownership in Google Search Console
1. Go to Google Search Console
2. Add property for your domain
3. Verify ownership using DNS record or HTML file
4. This enables domain-restricted OAuth
```

### 9.2 Security Hardening

```typescript
// Enhanced security configuration
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile',
      prompt: 'consent',
      access_type: 'offline',
      // Security enhancements
      include_granted_scopes: 'false',
      response_mode: 'query',
      state: generateSecureState() // CSRF protection
    }
  },
  checks: ['state', 'pkce'] // Enable PKCE for enhanced security
})
```

### 9.3 Monitoring and Analytics

```typescript
// Track OAuth events
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.provider === 'google') {
      // Log successful sign-in
      analytics.track('OAuth Sign In', {
        provider: 'google',
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
    }
    return true;
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Redirect URI Mismatch
```
Error: redirect_uri_mismatch
Solution: Ensure exact match between configured and actual redirect URIs
```

#### 2. Invalid Client Error
```
Error: invalid_client
Solution: Verify client ID and secret are correct
```

#### 3. Access Denied
```
Error: access_denied
Solution: Check OAuth consent screen configuration and user permissions
```

#### 4. Scope Errors
```
Error: invalid_scope
Solution: Verify requested scopes are enabled in Google Cloud Console
```

### Debug Configuration

```typescript
// Enable OAuth debugging
export default NextAuth({
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      console.log('[NextAuth Debug]', code, metadata);
    }
  }
});
```

## Security Considerations

### 1. Client Secret Protection

```bash
# Never expose client secret in frontend code
# Use environment variables
# Rotate secrets regularly
```

### 2. State Parameter Validation

```typescript
// Always validate state parameter
const validateState = (receivedState: string, expectedState: string): boolean => {
  return receivedState === expectedState && receivedState.length >= 32;
};
```

### 3. Token Security

```typescript
// Secure token storage
const secureTokenStorage = {
  store: (tokens: TokenSet) => {
    // Use encrypted storage
    // Set appropriate expiration
    // Implement refresh logic
  }
};
```

## Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google API Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Google Workspace Admin](https://admin.google.com/)

## Support

For issues with Google OAuth setup:

1. Check Google Cloud Console logs
2. Verify OAuth consent screen approval status
3. Review API quotas and limits
4. Contact Google Cloud Support for production issues
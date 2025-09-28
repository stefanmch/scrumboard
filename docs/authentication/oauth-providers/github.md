# GitHub OAuth Setup Guide

## Overview

This guide provides step-by-step instructions for setting up GitHub OAuth authentication for the Scrum board application, including both GitHub.com and GitHub Enterprise configurations.

## Prerequisites

- GitHub account or GitHub Enterprise access
- Administrator permissions for organization (if applicable)
- Scrum board application domain
- Understanding of OAuth 2.0 authorization code flow

## Step 1: Create GitHub OAuth App

### 1.1 Access GitHub OAuth Settings

**For Personal Account:**
1. Navigate to [GitHub Settings](https://github.com/settings/profile)
2. Click "Developer settings" in the left sidebar
3. Select "OAuth Apps"
4. Click "New OAuth App"

**For Organization:**
1. Navigate to your organization page
2. Click "Settings" tab
3. Select "Developer settings" → "OAuth Apps"
4. Click "New OAuth App"

### 1.2 Fill Application Details

```yaml
Application Name: "Scrum Board Application"
Homepage URL: "https://your-domain.com"
Application Description: "Agile project management and team collaboration platform"

Authorization Callback URL:
  # Development
  - http://localhost:3000/api/auth/callback/github

  # Staging
  - https://staging.your-domain.com/api/auth/callback/github

  # Production
  - https://your-domain.com/api/auth/callback/github
```

### 1.3 Generate Client Secret

```bash
1. After creating the app, click "Generate a new client secret"
2. Copy and securely store the Client ID and Client Secret
3. Note: Client secret is only shown once
```

### 1.4 Configure Application Settings

```yaml
# Optional settings
Application Logo: Upload 256x256 PNG/JPG
Badge Background Color: #24292e (GitHub dark)
Setup URL: https://your-domain.com/setup
Webhook URL: https://your-domain.com/api/webhooks/github
```

## Step 2: Environment Configuration

### 2.1 Development Environment

```bash
# .env.local
GITHUB_CLIENT_ID=Ov23abc123def456
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key
```

### 2.2 Production Environment

```bash
# .env.production
GITHUB_CLIENT_ID=Ov23prod123client456
GITHUB_CLIENT_SECRET=prod1234567890abcdef1234567890abcdef12345678
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

## Step 3: NextAuth.js Implementation

### 3.1 Provider Configuration

```typescript
// pages/api/auth/[...nextauth].ts
import GitHubProvider from 'next-auth/providers/github';

export default NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email read:org',
        }
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          // Additional GitHub-specific fields
          login: profile.login,
          bio: profile.bio,
          company: profile.company,
          location: profile.location,
          blog: profile.blog,
          hireable: profile.hireable,
          public_repos: profile.public_repos,
          followers: profile.followers,
          following: profile.following,
          github_created_at: profile.created_at
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'github') {
        // Verify email is verified (if required)
        const githubProfile = profile as any;
        if (githubProfile.email && !githubProfile.email_verified) {
          console.warn('GitHub email not verified:', githubProfile.email);
          // Decide whether to allow unverified emails
        }
        return true;
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'github') {
        // Store GitHub-specific information
        token.github_login = (profile as any)?.login;
        token.github_id = (profile as any)?.id;
        token.access_token = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.github_login) {
        session.user.github_login = token.github_login;
        session.user.github_id = token.github_id;
      }
      return session;
    }
  }
});
```

### 3.2 Custom GitHub OAuth Service

```typescript
// lib/auth/github-oauth.ts
export class GitHubOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID!;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`;
  }

  getAuthorizationUrl(state: string, scopes: string[] = ['read:user', 'user:email']): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description}`);
    }

    return data;
  }

  async getUserProfile(accessToken: string) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScrumBoard-App'
      }
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserEmails(accessToken: string) {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScrumBoard-App'
      }
    });

    if (!response.ok) {
      throw new Error(`Email fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserOrganizations(accessToken: string) {
    const response = await fetch('https://api.github.com/user/orgs', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScrumBoard-App'
      }
    });

    if (!response.ok) {
      throw new Error(`Organizations fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

## Step 4: GitHub Scopes Configuration

### 4.1 Available Scopes

```typescript
// GitHub OAuth scopes for different use cases
export const GitHubScopes = {
  // Basic user information
  basic: ['read:user', 'user:email'],

  // Repository access
  repos: ['repo', 'read:user', 'user:email'],

  // Organization access
  org: ['read:user', 'user:email', 'read:org'],

  // Full access (for GitHub integration features)
  full: [
    'read:user',
    'user:email',
    'read:org',
    'repo',
    'write:repo_hook',
    'admin:org_hook'
  ],

  // Enterprise features
  enterprise: [
    'read:user',
    'user:email',
    'read:org',
    'read:enterprise'
  ]
} as const;
```

### 4.2 Scope-based Configuration

```typescript
// Dynamic scope configuration based on features
export function getGitHubScopes(features: string[]): string[] {
  const scopes = new Set(['read:user', 'user:email']);

  if (features.includes('repository-integration')) {
    scopes.add('repo');
  }

  if (features.includes('organization-management')) {
    scopes.add('read:org');
    scopes.add('admin:org');
  }

  if (features.includes('webhook-management')) {
    scopes.add('write:repo_hook');
    scopes.add('admin:org_hook');
  }

  return Array.from(scopes);
}
```

## Step 5: GitHub Enterprise Configuration

### 5.1 GitHub Enterprise Server Setup

```typescript
// For GitHub Enterprise Server instances
GitHubProvider({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  // Custom GitHub Enterprise URLs
  authorization: {
    url: 'https://github.yourdomain.com/login/oauth/authorize',
    params: {
      scope: 'read:user user:email read:org'
    }
  },
  token: 'https://github.yourdomain.com/login/oauth/access_token',
  userinfo: 'https://github.yourdomain.com/api/v3/user',
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: profile.name || profile.login,
      email: profile.email,
      image: profile.avatar_url,
      login: profile.login
    };
  }
})
```

### 5.2 Enterprise Environment Variables

```bash
# GitHub Enterprise specific configuration
GITHUB_ENTERPRISE_URL=https://github.yourdomain.com
GITHUB_API_URL=https://github.yourdomain.com/api/v3
GITHUB_CLIENT_ID=your_enterprise_client_id
GITHUB_CLIENT_SECRET=your_enterprise_client_secret
```

## Step 6: Advanced Integration Features

### 6.1 Repository Integration

```typescript
// lib/integrations/github-repos.ts
export class GitHubRepositoryService {
  constructor(private accessToken: string) {}

  async getUserRepositories(type: 'all' | 'owner' | 'member' = 'owner') {
    const response = await fetch(`https://api.github.com/user/repos?type=${type}&sort=updated`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return await response.json();
  }

  async getRepositoryIssues(owner: string, repo: string) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return await response.json();
  }

  async createWebhook(owner: string, repo: string, webhookUrl: string) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'issues'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          insecure_ssl: '0'
        }
      })
    });

    return await response.json();
  }
}
```

### 6.2 Organization Management

```typescript
// lib/integrations/github-orgs.ts
export class GitHubOrganizationService {
  constructor(private accessToken: string) {}

  async getOrganizationMembers(org: string) {
    const response = await fetch(`https://api.github.com/orgs/${org}/members`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return await response.json();
  }

  async getOrganizationTeams(org: string) {
    const response = await fetch(`https://api.github.com/orgs/${org}/teams`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return await response.json();
  }

  async getUserOrganizationMembership(org: string, username: string) {
    const response = await fetch(`https://api.github.com/orgs/${org}/memberships/${username}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return null; // User is not a member
    }

    return await response.json();
  }
}
```

## Step 7: Webhook Integration

### 7.1 Webhook Setup

```typescript
// pages/api/webhooks/github.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'] as string;
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'] as string;

  switch (event) {
    case 'push':
      await handlePushEvent(req.body);
      break;
    case 'pull_request':
      await handlePullRequestEvent(req.body);
      break;
    case 'issues':
      await handleIssuesEvent(req.body);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }

  res.status(200).json({ success: true });
}

async function handlePushEvent(payload: any) {
  // Sync commits with Scrum board tasks
  const commits = payload.commits;
  for (const commit of commits) {
    // Extract task references from commit messages
    const taskRefs = extractTaskReferences(commit.message);
    // Update task status in database
  }
}
```

### 7.2 Webhook Security

```typescript
// lib/webhooks/github-security.ts
export class GitHubWebhookSecurity {
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSignature}`),
      Buffer.from(signature)
    );
  }

  static validatePayload(payload: any): boolean {
    // Validate required fields
    return payload &&
           typeof payload === 'object' &&
           payload.repository &&
           payload.sender;
  }

  static rateLimitCheck(req: NextApiRequest): boolean {
    // Implement rate limiting logic
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Check rate limits for IP
    return true;
  }
}
```

## Step 8: Testing

### 8.1 Development Testing

```typescript
// __tests__/auth/github-oauth.test.ts
import { GitHubOAuthService } from '../../lib/auth/github-oauth';

describe('GitHub OAuth Integration', () => {
  const service = new GitHubOAuthService();

  test('should generate valid authorization URL', () => {
    const state = 'test-state-123';
    const authUrl = service.getAuthorizationUrl(state);

    expect(authUrl).toContain('github.com/login/oauth/authorize');
    expect(authUrl).toContain(`client_id=${process.env.GITHUB_CLIENT_ID}`);
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('scope=read%3Auser%20user%3Aemail');
  });

  test('should handle token exchange', async () => {
    const mockCode = 'test-auth-code';

    // Mock fetch for token exchange
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        scope: 'read:user,user:email'
      })
    });

    const tokens = await service.exchangeCodeForTokens(mockCode);
    expect(tokens.access_token).toBe('mock-access-token');
  });
});
```

### 8.2 Integration Testing

```typescript
// __tests__/integration/github-integration.test.ts
describe('GitHub Integration', () => {
  test('should sync GitHub issues with Scrum board', async () => {
    // Test GitHub issue synchronization
  });

  test('should handle webhook events', async () => {
    // Test webhook processing
  });

  test('should manage organization memberships', async () => {
    // Test organization integration
  });
});
```

## Step 9: Production Deployment

### 9.1 Security Configuration

```typescript
// Enhanced security for production
GitHubProvider({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'read:user user:email',
      allow_signup: 'false', // Restrict to existing users
    }
  },
  checks: ['state'], // Enable CSRF protection
})
```

### 9.2 Monitoring and Logging

```typescript
// lib/monitoring/github-oauth.ts
export class GitHubOAuthMonitoring {
  static logAuthEvent(event: string, userId?: string, metadata?: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      provider: 'github',
      metadata
    };

    // Log to monitoring service
    console.log('[GitHub OAuth]', logData);

    // Send to analytics
    if (process.env.NODE_ENV === 'production') {
      // Send to your monitoring service
    }
  }

  static trackRateLimit(endpoint: string, remaining: number) {
    if (remaining < 100) {
      console.warn(`[GitHub API] Low rate limit for ${endpoint}: ${remaining} remaining`);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Application Not Approved
```
Error: The application has not been approved for this user
Solution: Check OAuth app approval status in organization settings
```

#### 2. Bad Verification Code
```
Error: bad_verification_code
Solution: Ensure authorization code is used only once and within time limit
```

#### 3. Incorrect Client Credentials
```
Error: incorrect_client_credentials
Solution: Verify client ID and secret are correct and active
```

#### 4. Redirect URI Mismatch
```
Error: redirect_uri_mismatch
Solution: Ensure callback URL exactly matches registered redirect URI
```

### Debug Configuration

```bash
# Enable GitHub OAuth debugging
DEBUG=github:oauth
NODE_ENV=development
GITHUB_OAUTH_DEBUG=true
```

## Security Best Practices

### 1. Scope Minimization
```typescript
// Request only necessary scopes
const requiredScopes = ['read:user', 'user:email'];
// Avoid overly broad scopes like 'repo' unless needed
```

### 2. Token Security
```typescript
// Secure token handling
const tokenStorage = {
  encrypt: (token: string) => {
    // Encrypt tokens before storage
  },
  rotate: (refreshToken: string) => {
    // Implement token rotation
  }
};
```

### 3. Organization Restrictions
```typescript
// Restrict to specific organizations
callbacks: {
  async signIn({ profile }) {
    const allowedOrgs = process.env.ALLOWED_GITHUB_ORGS?.split(',') || [];
    if (allowedOrgs.length > 0) {
      const userOrgs = await getUserOrganizations(profile.access_token);
      const hasValidOrg = userOrgs.some(org => allowedOrgs.includes(org.login));
      return hasValidOrg;
    }
    return true;
  }
}
```

## Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Enterprise Documentation](https://docs.github.com/en/enterprise-server)
- [GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks)

## Support

For GitHub OAuth issues:

1. Check GitHub Developer Settings for app status
2. Review OAuth app logs in GitHub
3. Verify organization OAuth app policies
4. Contact GitHub Support for API limits or restrictions
# Microsoft Azure AD OAuth Setup Guide

## Overview

This guide covers Microsoft Azure Active Directory (Azure AD) OAuth 2.0 implementation for the Scrum board application, including Microsoft Graph API integration and enterprise single sign-on (SSO) configuration.

## Prerequisites

- Microsoft Azure account with active subscription
- Azure AD tenant access (or ability to create one)
- Application registration permissions
- Understanding of OpenID Connect and OAuth 2.0

## Step 1: Azure AD App Registration

### 1.1 Access Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. Search for "Azure Active Directory" or go to [Azure AD Portal](https://aad.portal.azure.com/)

### 1.2 Register New Application

```bash
# Via Azure Portal:
1. Go to "Azure Active Directory" > "App registrations"
2. Click "New registration"
3. Fill in application details

# Via Azure CLI:
az ad app create \
  --display-name "Scrum Board Application" \
  --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
  --web-redirect-uris "http://localhost:3000/api/auth/callback/azure-ad" \
  --required-resource-accesses @manifest.json
```

### 1.3 Application Configuration

```yaml
Name: "Scrum Board Application"
Supported account types: "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"

Redirect URIs (Web):
  # Development
  - http://localhost:3000/api/auth/callback/azure-ad

  # Staging
  - https://staging.your-domain.com/api/auth/callback/azure-ad

  # Production
  - https://your-domain.com/api/auth/callback/azure-ad

Front-channel logout URL: https://your-domain.com/auth/logout
```

### 1.4 Generate Client Secret

```bash
# Azure Portal:
1. Go to "Certificates & secrets" tab
2. Click "New client secret"
3. Set description: "Scrum Board OAuth Secret"
4. Set expiration: 24 months (recommended)
5. Copy and securely store the secret value

# Azure CLI:
az ad app credential reset --id YOUR_APP_ID --append
```

## Step 2: API Permissions Configuration

### 2.1 Microsoft Graph Permissions

```yaml
# Required Delegated Permissions
Microsoft Graph:
  - openid                    # OpenID Connect sign-in
  - profile                   # Read user's basic profile
  - email                     # Read user's email address
  - User.Read                 # Read user profile
  - User.ReadBasic.All        # Read basic profiles of all users

# Optional Permissions (based on features)
Microsoft Graph (Extended):
  - Calendars.Read            # Read user calendars
  - Mail.Read                 # Read user mail
  - Files.Read                # Read user files
  - Sites.Read.All            # Read SharePoint sites
  - Team.ReadBasic.All        # Read Teams information
  - Directory.Read.All        # Read organization directory
  - Group.Read.All            # Read groups
```

### 2.2 Configure Permissions via Azure Portal

```bash
1. Go to "API permissions" tab
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Select required permissions
6. Click "Grant admin consent" (if you have admin rights)
```

### 2.3 Admin Consent

```bash
# For organization-wide consent
1. Click "Grant admin consent for [Organization]"
2. Confirm the consent
3. Verify status shows "Granted for [Organization]"

# Via PowerShell
Connect-AzureAD
New-AzureADServiceAppRoleAssignment -ObjectId $sp.ObjectId -Id $appRole.Id -PrincipalId $sp.ObjectId -ResourceId $resourceSp.ObjectId
```

## Step 3: Environment Configuration

### 3.1 Development Environment

```bash
# .env.local
AZURE_AD_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_AD_CLIENT_SECRET=abcd1234-ef56-78gh-90ij-klmnopqrstuv
AZURE_AD_TENANT_ID=87654321-4321-4321-4321-210987654321

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key

# Optional: Specific tenant configuration
AZURE_AD_TENANT_NAME=yourtenant.onmicrosoft.com
```

### 3.2 Production Environment

```bash
# .env.production
AZURE_AD_CLIENT_ID=prod-12345678-1234-1234-1234-123456789012
AZURE_AD_CLIENT_SECRET=prod-abcd1234-ef56-78gh-90ij-klmnopqrstuv
AZURE_AD_TENANT_ID=prod-87654321-4321-4321-4321-210987654321
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

## Step 4: NextAuth.js Implementation

### 4.1 Azure AD Provider Configuration

```typescript
// pages/api/auth/[...nextauth].ts
import AzureADProvider from 'next-auth/providers/azure-ad';

export default NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email User.Read',
          prompt: 'consent'
        }
      },
      profile(profile) {
        return {
          id: profile.oid || profile.sub,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: null, // Azure AD doesn't provide avatar URL directly
          // Additional Azure AD fields
          given_name: profile.given_name,
          family_name: profile.family_name,
          upn: profile.upn,
          tid: profile.tid,
          aud: profile.aud,
          preferred_username: profile.preferred_username
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'azure-ad') {
        // Verify tenant if required
        const allowedTenants = process.env.ALLOWED_AZURE_TENANTS?.split(',');
        if (allowedTenants && allowedTenants.length > 0) {
          const userTenant = (profile as any)?.tid;
          if (!allowedTenants.includes(userTenant)) {
            return false;
          }
        }
        return true;
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'azure-ad') {
        token.azure_oid = (profile as any)?.oid;
        token.azure_tid = (profile as any)?.tid;
        token.azure_upn = (profile as any)?.upn;
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.azure_oid) {
        session.user.azure_oid = token.azure_oid;
        session.user.azure_tid = token.azure_tid;
        session.user.azure_upn = token.azure_upn;
      }
      return session;
    }
  }
});
```

### 4.2 Custom Azure AD OAuth Service

```typescript
// lib/auth/azure-ad-oauth.ts
export class AzureADOAuthService {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.AZURE_AD_CLIENT_ID!;
    this.clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
    this.tenantId = process.env.AZURE_AD_TENANT_ID!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`;
  }

  getAuthorizationUrl(state: string, scopes: string[] = ['openid', 'profile', 'email', 'User.Read']): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
      response_mode: 'query',
      prompt: 'consent'
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description}`);
    }

    return await response.json();
  }

  async getUserProfile(accessToken: string) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserPhoto(accessToken: string) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }

    return null;
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile email User.Read'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

## Step 5: Microsoft Graph Integration

### 5.1 Graph API Service

```typescript
// lib/integrations/microsoft-graph.ts
export class MicrosoftGraphService {
  constructor(private accessToken: string) {}

  async getUserProfile() {
    const response = await this.makeGraphRequest('/me');
    return response;
  }

  async getUserManager() {
    const response = await this.makeGraphRequest('/me/manager');
    return response;
  }

  async getUserDirectReports() {
    const response = await this.makeGraphRequest('/me/directReports');
    return response;
  }

  async getUserGroups() {
    const response = await this.makeGraphRequest('/me/memberOf');
    return response;
  }

  async getUserCalendars() {
    const response = await this.makeGraphRequest('/me/calendars');
    return response;
  }

  async getUserMail(top: number = 10) {
    const response = await this.makeGraphRequest(`/me/messages?$top=${top}&$select=subject,from,receivedDateTime,isRead`);
    return response;
  }

  async getTeamsUserIsPartOf() {
    const response = await this.makeGraphRequest('/me/joinedTeams');
    return response;
  }

  async getUserOneDriveFiles() {
    const response = await this.makeGraphRequest('/me/drive/root/children');
    return response;
  }

  private async makeGraphRequest(endpoint: string) {
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  async batchRequests(requests: any[]) {
    const response = await fetch('https://graph.microsoft.com/v1.0/$batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: requests
      })
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

### 5.2 Organization Structure Integration

```typescript
// lib/integrations/azure-ad-org.ts
export class AzureADOrganizationService {
  constructor(private accessToken: string) {}

  async getOrganizationDetails() {
    const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    return await response.json();
  }

  async getAllUsers(select: string[] = ['id', 'displayName', 'mail', 'userPrincipalName']) {
    const selectParam = select.join(',');
    const response = await fetch(`https://graph.microsoft.com/v1.0/users?$select=${selectParam}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    return await response.json();
  }

  async getGroups() {
    const response = await fetch('https://graph.microsoft.com/v1.0/groups', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    return await response.json();
  }

  async getGroupMembers(groupId: string) {
    const response = await fetch(`https://graph.microsoft.com/v1.0/groups/${groupId}/members`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    return await response.json();
  }

  async getUsersByDepartment(department: string) {
    const response = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=department eq '${department}'`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    return await response.json();
  }
}
```

## Step 6: Enterprise SSO Configuration

### 6.1 Conditional Access Policies

```typescript
// lib/auth/conditional-access.ts
export class ConditionalAccessService {
  static validateConditionalAccess(profile: any): boolean {
    // Check for required conditions
    const requiredConditions = {
      emailVerified: profile.email_verified,
      mfaCompleted: profile.amr?.includes('mfa'),
      trustedLocation: profile.acr === '1' // Adjust based on your policy
    };

    return Object.values(requiredConditions).every(condition => condition === true);
  }

  static handleConditionalAccessFailure(reason: string) {
    // Log the failure reason
    console.warn(`Conditional access failed: ${reason}`);

    // Redirect to appropriate action
    switch (reason) {
      case 'mfa_required':
        return '/auth/mfa-setup';
      case 'device_compliance':
        return '/auth/device-compliance';
      case 'location_restricted':
        return '/auth/location-blocked';
      default:
        return '/auth/access-denied';
    }
  }
}
```

### 6.2 Multi-Factor Authentication

```typescript
// lib/auth/mfa-integration.ts
export class MFAIntegration {
  static validateMFAFromToken(idToken: any): boolean {
    // Check authentication methods reference (amr) claim
    const authMethods = idToken.amr || [];

    // Verify MFA was used
    return authMethods.includes('mfa') ||
           authMethods.includes('sms') ||
           authMethods.includes('oath') ||
           authMethods.includes('phone');
  }

  static requireMFAForSensitiveOperations(user: any): boolean {
    // Define sensitive operations that always require MFA
    const userRoles = user.roles || [];
    const sensitiveRoles = ['admin', 'project-manager', 'scrum-master'];

    return userRoles.some(role => sensitiveRoles.includes(role));
  }
}
```

### 6.3 Single Sign-Out

```typescript
// pages/api/auth/logout.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear application session
  // Redirect to Azure AD logout
  const logoutUrl = new URL(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/logout`);
  logoutUrl.searchParams.set('post_logout_redirect_uri', `${process.env.NEXTAUTH_URL}/`);

  res.redirect(logoutUrl.toString());
}
```

## Step 7: Testing

### 7.1 Development Testing

```typescript
// __tests__/auth/azure-ad-oauth.test.ts
import { AzureADOAuthService } from '../../lib/auth/azure-ad-oauth';

describe('Azure AD OAuth Integration', () => {
  const service = new AzureADOAuthService();

  test('should generate valid authorization URL', () => {
    const state = 'test-state-123';
    const authUrl = service.getAuthorizationUrl(state);

    expect(authUrl).toContain('login.microsoftonline.com');
    expect(authUrl).toContain(`client_id=${process.env.AZURE_AD_CLIENT_ID}`);
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('scope=openid%20profile%20email%20User.Read');
  });

  test('should handle token exchange', async () => {
    const mockCode = 'test-auth-code';

    // Mock fetch for token exchange
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email User.Read'
      })
    });

    const tokens = await service.exchangeCodeForTokens(mockCode);
    expect(tokens.access_token).toBe('mock-access-token');
  });
});
```

### 7.2 Graph API Testing

```typescript
// __tests__/integration/microsoft-graph.test.ts
import { MicrosoftGraphService } from '../../lib/integrations/microsoft-graph';

describe('Microsoft Graph Integration', () => {
  test('should fetch user profile', async () => {
    const mockAccessToken = 'mock-token';
    const service = new MicrosoftGraphService(mockAccessToken);

    // Mock Graph API response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user-id',
        displayName: 'John Doe',
        mail: 'john.doe@company.com'
      })
    });

    const profile = await service.getUserProfile();
    expect(profile.displayName).toBe('John Doe');
  });
});
```

## Step 8: Production Deployment

### 8.1 Security Configuration

```typescript
// Enhanced security for production
AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  tenantId: process.env.AZURE_AD_TENANT_ID!,
  authorization: {
    params: {
      scope: 'openid profile email User.Read',
      prompt: 'select_account', // Force account selection
      domain_hint: 'your-domain.com' // Pre-fill domain
    }
  },
  checks: ['state'], // Enable CSRF protection
})
```

### 8.2 Certificate-based Authentication

```bash
# Using certificate instead of client secret (more secure)
AZURE_AD_CERTIFICATE_THUMBPRINT=your_cert_thumbprint
AZURE_AD_CERTIFICATE_PRIVATE_KEY=your_private_key_path
```

```typescript
// Certificate-based authentication
const certificateConfig = {
  thumbprint: process.env.AZURE_AD_CERTIFICATE_THUMBPRINT!,
  privateKey: process.env.AZURE_AD_CERTIFICATE_PRIVATE_KEY!
};
```

## Troubleshooting

### Common Issues

#### 1. AADSTS50011: Redirect URI Mismatch
```
Error: The reply URL specified in the request does not match the reply URLs configured for the application
Solution: Ensure redirect URIs exactly match in Azure AD app registration
```

#### 2. AADSTS70001: Application Not Found
```
Error: Application with identifier 'client-id' was not found in the directory
Solution: Verify client ID and ensure app is registered in correct tenant
```

#### 3. AADSTS65001: Invalid Client
```
Error: The user or administrator has not consented to use the application
Solution: Grant admin consent for required permissions
```

#### 4. Graph API Insufficient Privileges
```
Error: Insufficient privileges to complete the operation
Solution: Ensure required Graph API permissions are granted and admin consented
```

### Debug Configuration

```typescript
// Enable Azure AD debugging
export default NextAuth({
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      if (code.includes('AZURE_AD')) {
        console.error('[Azure AD Error]', code, metadata);
      }
    }
  }
});
```

## Security Best Practices

### 1. Tenant Isolation
```typescript
// Restrict to specific tenants
const allowedTenants = process.env.ALLOWED_AZURE_TENANTS?.split(',') || [];

callbacks: {
  async signIn({ profile }) {
    if (allowedTenants.length > 0) {
      const userTenant = (profile as any)?.tid;
      return allowedTenants.includes(userTenant);
    }
    return true;
  }
}
```

### 2. Token Validation
```typescript
// Validate JWT tokens
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
});

export function validateAzureADToken(token: string) {
  return jwt.verify(token, getKey, {
    audience: clientId,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`
  });
}
```

### 3. Conditional Access Validation
```typescript
// Implement conditional access checks
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.provider === 'azure-ad') {
      const idToken = account.id_token;
      const decodedToken = jwt.decode(idToken);

      // Check for required authentication strength
      if (!decodedToken.amr?.includes('mfa')) {
        return '/auth/mfa-required';
      }

      return true;
    }
    return true;
  }
}
```

## Resources

- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Microsoft Graph Documentation](https://docs.microsoft.com/en-us/graph/)
- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [OpenID Connect on Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)

## Support

For Azure AD OAuth issues:

1. Check Azure AD sign-in logs in Azure Portal
2. Review app registration configuration
3. Verify API permissions and admin consent
4. Use Azure AD troubleshooting tools
5. Contact Microsoft support for tenant-specific issues
# SAML 2.0 Enterprise SSO Setup Guide

## Overview

This guide covers SAML 2.0 (Security Assertion Markup Language) implementation for enterprise single sign-on (SSO) integration with the Scrum board application. SAML enables secure authentication with enterprise identity providers like Active Directory Federation Services (ADFS), Okta, Auth0, OneLogin, and other SAML-compliant IdPs.

## Prerequisites

- Enterprise identity provider with SAML 2.0 support
- SSL certificate for secure communication
- Understanding of SAML concepts (IdP, SP, assertions)
- Access to configure SAML settings in your IdP

## Step 1: SAML Concepts Overview

### 1.1 SAML Components

```mermaid
graph LR
    User[User] --> IdP[Identity Provider]
    IdP --> SP[Service Provider - Scrum Board]
    SP --> User

    subgraph "SAML Flow"
        A[1. User accesses SP] --> B[2. SP redirects to IdP]
        B --> C[3. User authenticates at IdP]
        C --> D[4. IdP sends SAML assertion]
        D --> E[5. SP validates assertion]
        E --> F[6. User granted access]
    end
```

### 1.2 Key SAML Terms

```yaml
Identity Provider (IdP): # Enterprise system that authenticates users
Service Provider (SP):   # Your Scrum board application
SAML Assertion:         # XML document containing user identity info
Metadata:               # XML configuration for IdP and SP
Single Sign-On (SSO):   # Authentication mechanism
Single Logout (SLO):    # Logout mechanism
```

## Step 2: Service Provider Configuration

### 2.1 Install SAML Dependencies

```bash
npm install @node-saml/node-saml
npm install @types/passport-saml
npm install express-session
npm install passport passport-saml
```

### 2.2 Environment Configuration

```bash
# .env.local
# SAML Configuration
SAML_ISSUER=https://your-domain.com/saml/metadata
SAML_CALLBACK_URL=https://your-domain.com/api/auth/callback/saml
SAML_LOGOUT_URL=https://your-domain.com/api/auth/logout/saml
SAML_LOGOUT_CALLBACK_URL=https://your-domain.com/api/auth/logout/callback

# Identity Provider Settings
SAML_IDP_SSO_URL=https://your-idp.com/sso/saml
SAML_IDP_SLO_URL=https://your-idp.com/slo/saml
SAML_IDP_CERT="-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----"
SAML_IDP_ISSUER=https://your-idp.com/issuer

# Service Provider Settings
SAML_SP_CERT="-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----"
SAML_SP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----"

# Security Settings
SAML_WANT_ASSERTION_SIGNED=true
SAML_WANT_RESPONSE_SIGNED=true
SAML_SIGNATURE_ALGORITHM=http://www.w3.org/2001/04/xmldsig-more#rsa-sha256
SAML_DIGEST_ALGORITHM=http://www.w3.org/2001/04/xmlenc#sha256
```

### 2.3 SAML Service Implementation

```typescript
// lib/auth/saml-service.ts
import { SAML } from '@node-saml/node-saml';

export class SAMLService {
  private saml: SAML;

  constructor() {
    this.saml = new SAML({
      // Service Provider settings
      issuer: process.env.SAML_ISSUER!,
      callbackUrl: process.env.SAML_CALLBACK_URL!,
      logoutUrl: process.env.SAML_LOGOUT_URL!,
      logoutCallbackUrl: process.env.SAML_LOGOUT_CALLBACK_URL!,

      // Identity Provider settings
      entryPoint: process.env.SAML_IDP_SSO_URL!,
      logoutEntryPoint: process.env.SAML_IDP_SLO_URL,
      cert: process.env.SAML_IDP_CERT!,
      issuer: process.env.SAML_IDP_ISSUER!,

      // Security settings
      wantAssertionsSigned: process.env.SAML_WANT_ASSERTION_SIGNED === 'true',
      wantAuthnResponseSigned: process.env.SAML_WANT_RESPONSE_SIGNED === 'true',
      signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',
      digestAlgorithm: process.env.SAML_DIGEST_ALGORITHM || 'sha256',

      // Service Provider certificate for signing
      privateCert: process.env.SAML_SP_PRIVATE_KEY,
      cert: process.env.SAML_SP_CERT,

      // Additional options
      acceptedClockSkewMs: 60000, // 1 minute clock skew tolerance
      attributeConsumingServiceIndex: false,
      disableRequestedAuthnContext: true,
      forceAuthn: false,
      skipRequestCompression: false,
      authnRequestBinding: 'HTTP-Redirect',
      validateInResponseTo: true,
      requestIdExpirationPeriodMs: 3600000, // 1 hour
      cacheProvider: new Map() // Simple in-memory cache
    });
  }

  async getAuthorizeUrl(relayState?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.saml.getAuthorizeUrl({}, relayState || '', (err, url) => {
        if (err) reject(err);
        else resolve(url!);
      });
    });
  }

  async validatePostResponse(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.saml.validatePostResponse(body, (err, profile) => {
        if (err) reject(err);
        else resolve(profile);
      });
    });
  }

  async getLogoutUrl(user: any, relayState?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.saml.getLogoutUrl(user, relayState || '', (err, url) => {
        if (err) reject(err);
        else resolve(url!);
      });
    });
  }

  async validatePostLogoutResponse(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.saml.validatePostResponse(body, (err, profile) => {
        if (err) reject(err);
        else resolve(profile);
      });
    });
  }

  getMetadata(): string {
    return this.saml.generateServiceProviderMetadata(
      process.env.SAML_SP_CERT,
      process.env.SAML_SP_CERT
    );
  }
}
```

## Step 3: NextAuth.js SAML Provider

### 3.1 Custom SAML Provider

```typescript
// lib/auth/saml-provider.ts
import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

export interface SAMLProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  groups?: string[];
  [key: string]: any;
}

export default function SAMLProvider<P extends SAMLProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: 'saml',
    name: 'SAML SSO',
    type: 'oauth',
    authorization: {
      url: process.env.SAML_IDP_SSO_URL!,
      params: {
        response_type: 'saml',
        SAMLRequest: '', // Will be generated dynamically
      }
    },
    token: {
      url: process.env.SAML_CALLBACK_URL!,
    },
    userinfo: {
      url: '', // Not used in SAML flow
    },
    profile(profile: P) {
      return {
        id: profile.id || profile.email,
        name: profile.name || `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        image: null,
        // Map additional SAML attributes
        firstName: profile.firstName,
        lastName: profile.lastName,
        department: profile.department,
        title: profile.title,
        groups: profile.groups || []
      };
    },
    style: {
      logo: '/images/saml-icon.svg',
      logoDark: '/images/saml-icon-dark.svg',
      bg: '#fff',
      text: '#000',
      bgDark: '#000',
      textDark: '#fff'
    },
    options
  };
}
```

### 3.2 SAML Authentication Handler

```typescript
// pages/api/auth/saml/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SAMLService } from '../../../../lib/auth/saml-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const samlService = new SAMLService();
    const relayState = req.query.returnUrl as string;

    const authorizeUrl = await samlService.getAuthorizeUrl(relayState);

    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('SAML login error:', error);
    res.status(500).json({ error: 'SAML login failed' });
  }
}
```

### 3.3 SAML Callback Handler

```typescript
// pages/api/auth/callback/saml.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SAMLService } from '../../../../lib/auth/saml-service';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const samlService = new SAMLService();
    const profile = await samlService.validatePostResponse(req.body);

    if (!profile) {
      throw new Error('No profile data received from SAML response');
    }

    // Map SAML attributes to user profile
    const userProfile = mapSAMLAttributes(profile);

    // Validate user authorization
    if (!isUserAuthorized(userProfile)) {
      return res.status(403).json({ error: 'User not authorized' });
    }

    // Create or update user in database
    const user = await createOrUpdateUser(userProfile);

    // Create session
    await createUserSession(req, res, user);

    // Redirect to application
    const returnUrl = req.body.RelayState || '/dashboard';
    res.redirect(returnUrl);

  } catch (error) {
    console.error('SAML callback error:', error);
    res.status(400).json({ error: 'SAML authentication failed' });
  }
}

function mapSAMLAttributes(profile: any) {
  return {
    id: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || profile.email,
    email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || profile.email,
    name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || profile.displayName,
    firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || profile.firstName,
    lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || profile.lastName,
    department: profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/department'] || profile.department,
    title: profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/title'] || profile.title,
    groups: profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] || profile.groups || [],
    upn: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn'] || profile.userPrincipalName
  };
}

function isUserAuthorized(userProfile: any): boolean {
  // Implement authorization logic
  const requiredGroups = process.env.SAML_REQUIRED_GROUPS?.split(',') || [];

  if (requiredGroups.length > 0) {
    const userGroups = userProfile.groups || [];
    return requiredGroups.some(group => userGroups.includes(group));
  }

  return true; // Allow all users if no group restrictions
}
```

## Step 4: Service Provider Metadata

### 4.1 Metadata Endpoint

```typescript
// pages/api/auth/saml/metadata.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SAMLService } from '../../../../lib/auth/saml-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const samlService = new SAMLService();
    const metadata = samlService.getMetadata();

    res.setHeader('Content-Type', 'application/samlmetadata+xml');
    res.status(200).send(metadata);
  } catch (error) {
    console.error('Metadata generation error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
}
```

### 4.2 Custom Metadata Template

```typescript
// lib/auth/saml-metadata.ts
export function generateCustomMetadata(config: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${config.issuer}">
  <md:SPSSODescriptor AuthnRequestsSigned="true"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">

    <!-- Signing Certificate -->
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${config.cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>

    <!-- Encryption Certificate -->
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${config.cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>

    <!-- Single Logout Service -->
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${config.logoutUrl}" />

    <!-- Name ID Format -->
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>

    <!-- Assertion Consumer Service -->
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${config.callbackUrl}"
                                 index="1"
                                 isDefault="true" />

    <!-- Attribute Consuming Service -->
    <md:AttributeConsumingService index="1" isDefault="true">
      <md:ServiceName xml:lang="en">Scrum Board Application</md:ServiceName>
      <md:ServiceDescription xml:lang="en">Agile project management platform</md:ServiceDescription>

      <!-- Requested Attributes -->
      <md:RequestedAttribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"
                             isRequired="true" />
      <md:RequestedAttribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"
                             isRequired="true" />
      <md:RequestedAttribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" />
      <md:RequestedAttribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" />
      <md:RequestedAttribute Name="http://schemas.microsoft.com/ws/2008/06/identity/claims/department"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" />
      <md:RequestedAttribute Name="http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
                             NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" />
    </md:AttributeConsumingService>
  </md:SPSSODescriptor>

  <!-- Organization Info -->
  <md:Organization>
    <md:OrganizationName xml:lang="en">Your Organization</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">Your Organization</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://your-domain.com</md:OrganizationURL>
  </md:Organization>

  <!-- Contact Info -->
  <md:ContactPerson contactType="technical">
    <md:EmailAddress>support@your-domain.com</md:EmailAddress>
  </md:ContactPerson>
</md:EntityDescriptor>`;
}
```

## Step 5: Identity Provider Configuration

### 5.1 ADFS Configuration

```powershell
# PowerShell script for ADFS configuration
Add-ADFSRelyingPartyTrust `
  -Name "Scrum Board Application" `
  -MetadataUrl "https://your-domain.com/api/auth/saml/metadata" `
  -Identifier "https://your-domain.com/saml/metadata" `
  -AccessControlPolicyName "Permit everyone"

# Configure claim rules
$claimRules = @"
@RuleName = "Send Email as Name ID"
c:[Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]
=> issue(Type = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", Issuer = c.Issuer, OriginalIssuer = c.OriginalIssuer, Value = c.Value, ValueType = c.ValueType, Properties["http://schemas.xmlsoap.org/ws/2005/05/identity/claimproperties/format"] = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");

@RuleName = "Send All Claims"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname"]
=> issue(store = "Active Directory", types = ("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname", "http://schemas.microsoft.com/ws/2008/06/identity/claims/department"), query = ";mail,givenName,sn,department;{0}", param = c.Value);
"@

Set-ADFSRelyingPartyTrust `
  -TargetName "Scrum Board Application" `
  -IssuanceTransformRules $claimRules
```

### 5.2 Okta Configuration

```yaml
# Okta SAML App Configuration
App Name: "Scrum Board Application"
App Type: "SAML 2.0"

Single Sign-On URL: "https://your-domain.com/api/auth/callback/saml"
Audience URI (SP Entity ID): "https://your-domain.com/saml/metadata"
Default RelayState: "/dashboard"
Name ID Format: "EmailAddress"
Application Username: "Email"

Attribute Statements:
  - Name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    Value: "${user.email}"
  - Name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    Value: "${user.displayName}"
  - Name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
    Value: "${user.firstName}"
  - Name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
    Value: "${user.lastName}"
  - Name: "http://schemas.microsoft.com/ws/2008/06/identity/claims/department"
    Value: "${user.department}"

Group Attribute Statements:
  - Name: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
    Filter: "Matches regex .*"
    Value: "${user.groups}"
```

### 5.3 Auth0 Configuration

```json
{
  "name": "Scrum Board Application",
  "strategy": "samlp",
  "callback": "https://your-domain.com/api/auth/callback/saml",
  "settings": {
    "audience": "https://your-domain.com/saml/metadata",
    "recipient": "https://your-domain.com/api/auth/callback/saml",
    "destination": "https://your-domain.com/api/auth/callback/saml",
    "mappings": {
      "user_id": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "given_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      "family_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
    },
    "createUpnClaim": false,
    "passthroughClaimsWithNoMapping": false,
    "mapUnknownClaimsAsIs": false,
    "mapIdentities": false,
    "nameIdentifierFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "nameIdentifierProbes": [
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ]
  }
}
```

## Step 6: Single Logout Implementation

### 6.1 Logout Handler

```typescript
// pages/api/auth/logout/saml.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SAMLService } from '../../../../lib/auth/saml-service';
import { getSession, signOut } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });

    if (!session) {
      return res.status(401).json({ error: 'No active session' });
    }

    const samlService = new SAMLService();
    const user = {
      nameID: session.user.id,
      nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      sessionIndex: session.user.sessionIndex
    };

    // Clear local session
    await signOut({ redirect: false });

    // Get SAML logout URL
    const logoutUrl = await samlService.getLogoutUrl(user);

    res.redirect(logoutUrl);
  } catch (error) {
    console.error('SAML logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}
```

### 6.2 Logout Callback Handler

```typescript
// pages/api/auth/logout/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SAMLService } from '../../../../lib/auth/saml-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const samlService = new SAMLService();
    await samlService.validatePostLogoutResponse(req.body);

    // Logout successful, redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('SAML logout callback error:', error);
    res.status(400).json({ error: 'Logout callback failed' });
  }
}
```

## Step 7: Testing and Validation

### 7.1 SAML Response Validation

```typescript
// lib/auth/saml-validator.ts
import { parseString } from 'xml2js';
import { DOMParser } from 'xmldom';

export class SAMLValidator {
  static async validateSAMLResponse(xmlString: string): Promise<boolean> {
    try {
      // Parse XML
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');

      // Check for SAML Response
      const responses = doc.getElementsByTagName('saml2p:Response');
      if (responses.length === 0) {
        throw new Error('No SAML Response found');
      }

      // Validate status
      const status = doc.getElementsByTagName('saml2p:StatusCode');
      if (status.length === 0 || status[0].getAttribute('Value') !== 'urn:oasis:names:tc:SAML:2.0:status:Success') {
        throw new Error('SAML Response status is not success');
      }

      // Validate assertion
      const assertions = doc.getElementsByTagName('saml2:Assertion');
      if (assertions.length === 0) {
        throw new Error('No SAML Assertion found');
      }

      return true;
    } catch (error) {
      console.error('SAML validation error:', error);
      return false;
    }
  }

  static extractAttributes(xmlString: string): Record<string, any> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const attributes: Record<string, any> = {};

    const attributeStatements = doc.getElementsByTagName('saml2:AttributeStatement');

    for (let i = 0; i < attributeStatements.length; i++) {
      const attrs = attributeStatements[i].getElementsByTagName('saml2:Attribute');

      for (let j = 0; j < attrs.length; j++) {
        const attr = attrs[j];
        const name = attr.getAttribute('Name');
        const values = attr.getElementsByTagName('saml2:AttributeValue');

        if (name && values.length > 0) {
          if (values.length === 1) {
            attributes[name] = values[0].textContent;
          } else {
            attributes[name] = Array.from(values).map(v => v.textContent);
          }
        }
      }
    }

    return attributes;
  }
}
```

### 7.2 Development Testing

```typescript
// __tests__/auth/saml-integration.test.ts
import { SAMLService } from '../../lib/auth/saml-service';
import { SAMLValidator } from '../../lib/auth/saml-validator';

describe('SAML Integration', () => {
  const samlService = new SAMLService();

  test('should generate valid metadata', () => {
    const metadata = samlService.getMetadata();

    expect(metadata).toContain('EntityDescriptor');
    expect(metadata).toContain('SPSSODescriptor');
    expect(metadata).toContain(process.env.SAML_ISSUER);
  });

  test('should validate SAML response format', async () => {
    const mockSAMLResponse = `<?xml version="1.0"?>
      <saml2p:Response xmlns:saml2p="urn:oasis:names:tc:SAML:2.0:protocol">
        <saml2p:Status>
          <saml2p:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </saml2p:Status>
        <saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml2:AttributeStatement>
            <saml2:Attribute Name="email">
              <saml2:AttributeValue>test@example.com</saml2:AttributeValue>
            </saml2:Attribute>
          </saml2:AttributeStatement>
        </saml2:Assertion>
      </saml2p:Response>`;

    const isValid = await SAMLValidator.validateSAMLResponse(mockSAMLResponse);
    expect(isValid).toBe(true);
  });

  test('should extract attributes from SAML response', () => {
    const mockSAMLResponse = `<?xml version="1.0"?>
      <saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml2:AttributeStatement>
          <saml2:Attribute Name="email">
            <saml2:AttributeValue>test@example.com</saml2:AttributeValue>
          </saml2:Attribute>
          <saml2:Attribute Name="name">
            <saml2:AttributeValue>Test User</saml2:AttributeValue>
          </saml2:Attribute>
        </saml2:AttributeStatement>
      </saml2:Assertion>`;

    const attributes = SAMLValidator.extractAttributes(mockSAMLResponse);

    expect(attributes.email).toBe('test@example.com');
    expect(attributes.name).toBe('Test User');
  });
});
```

## Step 8: Security Best Practices

### 8.1 Certificate Management

```typescript
// lib/auth/saml-certificates.ts
export class SAMLCertificateManager {
  static validateCertificate(cert: string): boolean {
    try {
      // Remove header/footer and whitespace
      const cleanCert = cert
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');

      // Basic format validation
      if (cleanCert.length === 0) {
        return false;
      }

      // Check if it's valid base64
      const decoded = Buffer.from(cleanCert, 'base64');
      return decoded.length > 0;
    } catch (error) {
      return false;
    }
  }

  static getCertificateInfo(cert: string): any {
    // Implementation would use a proper certificate parsing library
    // This is a simplified example
    return {
      subject: 'CN=Your IdP',
      issuer: 'CN=Certificate Authority',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      fingerprint: 'SHA1:...'
    };
  }

  static isExpiringSoon(cert: string, daysThreshold: number = 30): boolean {
    const info = this.getCertificateInfo(cert);
    const expiryDate = new Date(info.validTo);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysThreshold);

    return expiryDate < warningDate;
  }
}
```

### 8.2 Security Headers

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Apply security headers to SAML endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/saml/')) {
    const response = NextResponse.next();

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/auth/saml/:path*'
};
```

## Step 9: Troubleshooting

### Common Issues

#### 1. Metadata Parsing Errors
```
Error: Invalid metadata format
Solution: Validate XML syntax and ensure all required elements are present
```

#### 2. Certificate Validation Failures
```
Error: Certificate verification failed
Solution: Ensure IdP certificate is correctly formatted and not expired
```

#### 3. Assertion Validation Errors
```
Error: SAML assertion validation failed
Solution: Check clock synchronization and assertion signing configuration
```

#### 4. Attribute Mapping Issues
```
Error: Required attributes not found
Solution: Verify attribute mapping configuration in IdP
```

### Debug Configuration

```typescript
// Enable SAML debugging
const samlConfig = {
  // ... other config
  debug: process.env.NODE_ENV === 'development',
  logLevel: 'debug'
};
```

## Security Considerations

### 1. Assertion Security
- Always validate SAML assertions
- Verify digital signatures
- Check assertion timestamps
- Validate audience restrictions

### 2. Communication Security
- Use HTTPS for all SAML endpoints
- Implement proper certificate validation
- Secure private key storage
- Regular certificate rotation

### 3. Session Management
- Implement session timeout
- Secure session storage
- Proper logout handling
- Session hijacking protection

## Resources

- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/v2.0/)
- [SAML Security Guidelines](https://docs.oasis-open.org/security/saml/v2.0/saml-sec-consider-2.0-os.pdf)
- [Node-SAML Documentation](https://github.com/node-saml/node-saml)
- [SAML Testing Tools](https://www.samltool.com/)

## Support

For SAML SSO issues:

1. Validate metadata exchange between IdP and SP
2. Check SAML trace logs in browser developer tools
3. Verify certificate validity and configuration
4. Test with SAML validation tools
5. Review IdP-specific documentation and support resources
# Security Protocols Implementation Guide

## Overview

This document provides detailed implementation guidelines for securing the Scrum Board application. It covers authentication, authorization, data protection, and monitoring protocols to establish a comprehensive security framework.

## Table of Contents

1. [Authentication Implementation](#authentication-implementation)
2. [Authorization Framework](#authorization-framework)
3. [Data Protection Protocols](#data-protection-protocols)
4. [API Security](#api-security)
5. [Session Management](#session-management)
6. [Input Validation and Sanitization](#input-validation-and-sanitization)
7. [Encryption Standards](#encryption-standards)
8. [Security Headers and CSP](#security-headers-and-csp)
9. [Audit Logging](#audit-logging)
10. [Rate Limiting and DoS Protection](#rate-limiting-and-dos-protection)
11. [Security Monitoring](#security-monitoring)
12. [Vulnerability Management](#vulnerability-management)
13. [Configuration Management](#configuration-management)

## Authentication Implementation

### 1.1 JWT-Based Authentication

```typescript
// JWT Configuration
export const jwtConfig = {
  secret: process.env.JWT_SECRET, // 256-bit random key
  signOptions: {
    expiresIn: '15m', // Short-lived access tokens
    issuer: 'scrumboard-api',
    audience: 'scrumboard-client',
    algorithm: 'HS256'
  },
  refreshTokenExpiry: '7d',
  maxRefreshTokens: 5 // Per user
};

// Token Generation Service
@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async generateTokenPair(userId: string, deviceId?: string) {
    const payload = {
      sub: userId,
      deviceId,
      type: 'access'
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(userId, deviceId);

    return { accessToken, refreshToken };
  }

  private async generateRefreshToken(userId: string, deviceId?: string) {
    const token = crypto.randomBytes(64).toString('hex');
    const hashedToken = await bcrypt.hash(token, 12);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        deviceId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      }
    });

    return token;
  }
}
```

### 1.2 Multi-Factor Authentication (MFA)

```typescript
// TOTP Implementation
export class MfaService {
  private readonly totpWindow = 1; // Allow 1 window tolerance
  private readonly backupCodeLength = 8;
  private readonly backupCodeCount = 10;

  async generateMfaSetup(userId: string) {
    const secret = speakeasy.generateSecret({
      name: `Scrum Board (${userId})`,
      issuer: 'Scrum Board'
    });

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );

    await this.prisma.userMfa.upsert({
      where: { userId },
      create: {
        userId,
        secret: this.encrypt(secret.base32),
        backupCodes: hashedBackupCodes,
        isEnabled: false
      },
      update: {
        secret: this.encrypt(secret.base32),
        backupCodes: hashedBackupCodes
      }
    });

    return {
      qrCode: secret.otpauth_url,
      manualEntryKey: secret.base32,
      backupCodes
    };
  }

  async verifyTotp(userId: string, token: string) {
    const mfa = await this.prisma.userMfa.findUnique({
      where: { userId }
    });

    if (!mfa || !mfa.isEnabled) {
      throw new UnauthorizedException('MFA not configured');
    }

    const secret = this.decrypt(mfa.secret);
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.totpWindow
    });
  }
}
```

### 1.3 Biometric Authentication Support

```typescript
// WebAuthn Implementation
export class WebAuthnService {
  async generateRegistrationOptions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    const options = await generateRegistrationOptions({
      rpName: 'Scrum Board',
      rpID: process.env.RP_ID,
      userID: userId,
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform'
      }
    });

    await this.prisma.webauthnChallenge.create({
      data: {
        userId,
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    return options;
  }
}
```

## Authorization Framework

### 2.1 Role-Based Access Control (RBAC)

```typescript
// Role Definitions
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SCRUM_MASTER = 'SCRUM_MASTER',
  DEVELOPER = 'DEVELOPER',
  STAKEHOLDER = 'STAKEHOLDER',
  VIEWER = 'VIEWER'
}

// Permission System
export enum Permission {
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Project Management
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // Story Management
  STORY_CREATE = 'story:create',
  STORY_READ = 'story:read',
  STORY_UPDATE = 'story:update',
  STORY_DELETE = 'story:delete',
  STORY_ASSIGN = 'story:assign',
  
  // Sprint Management
  SPRINT_CREATE = 'sprint:create',
  SPRINT_READ = 'sprint:read',
  SPRINT_UPDATE = 'sprint:update',
  SPRINT_DELETE = 'sprint:delete',
  
  // Reporting
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export'
}

// Role-Permission Mapping
export const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ORG_ADMIN]: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT
  ],
  [Role.PROJECT_MANAGER]: [
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.STORY_CREATE,
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.STORY_DELETE,
    Permission.STORY_ASSIGN,
    Permission.SPRINT_CREATE,
    Permission.SPRINT_READ,
    Permission.SPRINT_UPDATE,
    Permission.REPORTS_VIEW
  ],
  [Role.SCRUM_MASTER]: [
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.STORY_ASSIGN,
    Permission.SPRINT_CREATE,
    Permission.SPRINT_READ,
    Permission.SPRINT_UPDATE,
    Permission.REPORTS_VIEW
  ],
  [Role.DEVELOPER]: [
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.SPRINT_READ
  ],
  [Role.STAKEHOLDER]: [
    Permission.STORY_READ,
    Permission.SPRINT_READ,
    Permission.REPORTS_VIEW
  ],
  [Role.VIEWER]: [
    Permission.STORY_READ,
    Permission.SPRINT_READ
  ]
};

// Authorization Guard
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userPermissions = await this.authService.getUserPermissions(user.id);
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### 2.2 Resource-Level Authorization

```typescript
// Resource Ownership Check
export class ResourceAuthorizationService {
  constructor(private prisma: PrismaService) {}

  async canAccessStory(userId: string, storyId: string, action: Permission): Promise<boolean> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        project: {
          include: {
            members: {
              where: { userId },
              include: { role: true }
            }
          }
        }
      }
    });

    if (!story) {
      return false;
    }

    const membership = story.project.members[0];
    if (!membership) {
      return false;
    }

    const rolePermissions = this.getRolePermissions(membership.role.name as Role);
    return rolePermissions.includes(action);
  }

  async canAccessProject(userId: string, projectId: string, action: Permission): Promise<boolean> {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        userId,
        projectId
      },
      include: { role: true }
    });

    if (!membership) {
      return false;
    }

    const rolePermissions = this.getRolePermissions(membership.role.name as Role);
    return rolePermissions.includes(action);
  }
}
```

## Data Protection Protocols

### 3.1 Data Classification

```typescript
// Data Classification Levels
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

// Data Classification Rules
export const dataClassificationRules = {
  user: {
    email: DataClassification.CONFIDENTIAL,
    name: DataClassification.INTERNAL,
    role: DataClassification.INTERNAL,
    lastLogin: DataClassification.CONFIDENTIAL
  },
  story: {
    title: DataClassification.INTERNAL,
    description: DataClassification.CONFIDENTIAL,
    acceptanceCriteria: DataClassification.CONFIDENTIAL,
    businessValue: DataClassification.RESTRICTED
  },
  project: {
    name: DataClassification.INTERNAL,
    description: DataClassification.CONFIDENTIAL,
    budget: DataClassification.RESTRICTED
  }
};
```

### 3.2 Data Encryption

```typescript
// Encryption Service
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationRounds = 100000;

  encrypt(plaintext: string, masterKey?: string): string {
    const key = masterKey || process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string, masterKey?: string): string {
    const key = masterKey || process.env.ENCRYPTION_KEY;
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Field-level encryption
  async encryptSensitiveFields<T>(data: T, schema: any): Promise<T> {
    const result = { ...data };
    
    for (const [field, classification] of Object.entries(schema)) {
      if (classification === DataClassification.CONFIDENTIAL || 
          classification === DataClassification.RESTRICTED) {
        if (result[field]) {
          result[field] = this.encrypt(String(result[field]));
        }
      }
    }
    
    return result;
  }
}
```

## API Security

### 4.1 API Authentication Middleware

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private tokenService: TokenService,
    private auditService: AuditService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    try {
      const result = await super.canActivate(context) as boolean;
      
      if (result) {
        // Log successful authentication
        await this.auditService.logEvent({
          action: 'AUTH_SUCCESS',
          userId: request.user?.id,
          ipAddress: request.ip,
          userAgent: request.get('User-Agent'),
          endpoint: request.path
        });
      }

      return result;
    } catch (error) {
      // Log failed authentication
      await this.auditService.logEvent({
        action: 'AUTH_FAILURE',
        error: error.message,
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        endpoint: request.path
      });
      
      throw error;
    }
  }
}
```

### 4.2 API Rate Limiting

```typescript
// Adaptive Rate Limiting
export class AdaptiveRateLimitGuard implements CanActivate {
  private readonly redis: Redis;
  private readonly limits = {
    authentication: { points: 5, duration: 900 }, // 5 attempts per 15 minutes
    api: { points: 100, duration: 60 }, // 100 requests per minute
    sensitive: { points: 10, duration: 60 } // 10 sensitive operations per minute
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.getRateLimitKey(request);
    const limit = this.getLimit(request);

    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, limit.duration);
    }

    if (current > limit.points) {
      // Implement progressive delays
      const delay = Math.min(Math.pow(2, current - limit.points) * 1000, 30000);
      
      throw new ThrottlerException({
        message: 'Rate limit exceeded',
        retryAfter: delay / 1000
      });
    }

    return true;
  }

  private getRateLimitKey(request: any): string {
    const identifier = request.user?.id || request.ip;
    const endpoint = request.route?.path || request.path;
    return `rate_limit:${identifier}:${endpoint}`;
  }
}
```

## Session Management

### 5.1 Secure Session Configuration

```typescript
// Session Configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'scrumboard.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // 15 minutes
    sameSite: 'strict' as const
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 15 * 60 // 15 minutes
  })
};

// Session Security Service
export class SessionSecurityService {
  async createSecureSession(userId: string, deviceInfo: any) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    };

    await this.redis.setex(
      `session:${sessionId}`,
      sessionConfig.cookie.maxAge / 1000,
      JSON.stringify(sessionData)
    );

    return sessionId;
  }

  async validateSessionSecurity(sessionId: string, request: any): Promise<boolean> {
    const sessionData = await this.getSessionData(sessionId);
    
    if (!sessionData) {
      return false;
    }

    // Check for session hijacking indicators
    if (sessionData.ipAddress !== request.ip) {
      await this.auditService.logSecurityEvent({
        type: 'SESSION_IP_MISMATCH',
        sessionId,
        originalIp: sessionData.ipAddress,
        currentIp: request.ip
      });
      return false;
    }

    if (sessionData.userAgent !== request.get('User-Agent')) {
      await this.auditService.logSecurityEvent({
        type: 'SESSION_UA_MISMATCH',
        sessionId,
        originalUA: sessionData.userAgent,
        currentUA: request.get('User-Agent')
      });
      return false;
    }

    // Update last activity
    sessionData.lastActivity = new Date();
    await this.updateSessionData(sessionId, sessionData);

    return true;
  }
}
```

## Input Validation and Sanitization

### 6.1 Comprehensive Input Validation

```typescript
// Validation Schemas
export const validationSchemas = {
  createStory: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .pattern(/^[\w\s\-.,!?()]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Title contains invalid characters'
      }),
    description: Joi.string()
      .max(5000)
      .allow('')
      .custom((value, helpers) => {
        // Remove potentially dangerous HTML
        const sanitized = DOMPurify.sanitize(value, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
          ALLOWED_ATTR: []
        });
        return sanitized;
      }),
    storyPoints: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .allow(null),
    priority: Joi.string()
      .valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
      .default('MEDIUM')
  }),
  
  userRegistration: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required(),
    password: Joi.string()
      .min(12)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)  
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
  })
};

// Input Sanitization Service
export class SanitizationService {
  sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false
    });
  }

  sanitizeSql(input: string): string {
    // Additional SQL injection protection (Prisma handles this, but defense in depth)
    return input
      .replace(/[';"\\]/g, '')
      .replace(/(?:\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s*)/gi, '');
  }

  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  validateAndSanitizeInput<T>(data: T, schema: Joi.ObjectSchema): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    return value;
  }
}
```

## Encryption Standards

### 7.1 Cryptographic Standards

```typescript
// Cryptographic Configuration
export const cryptoConfig = {
  // Password Hashing
  bcrypt: {
    rounds: 12 // Minimum recommended rounds
  },
  
  // Symmetric Encryption
  aes: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },
  
  // Asymmetric Encryption
  rsa: {
    keySize: 4096,
    publicExponent: 0x10001,
    mgf: 'mgf1',
    hashAlgorithm: 'sha256'
  },
  
  // Digital Signatures
  ecdsa: {
    curve: 'secp384r1',
    hashAlgorithm: 'sha384'
  },
  
  // Key Derivation
  pbkdf2: {
    iterations: 100000,
    keyLength: 32,
    digest: 'sha256'
  }
};

// Secure Key Management
export class KeyManagementService {
  private readonly keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days

  async generateMasterKey(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  async deriveKey(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, cryptoConfig.pbkdf2.iterations, 
        cryptoConfig.pbkdf2.keyLength, cryptoConfig.pbkdf2.digest, 
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        });
    });
  }

  async rotateKeys(): Promise<void> {
    const newKey = await this.generateMasterKey();
    const oldKey = process.env.ENCRYPTION_KEY;

    // Re-encrypt all sensitive data with new key
    await this.reEncryptSensitiveData(oldKey, newKey);
    
    // Update environment configuration
    await this.updateKeyConfiguration(newKey);
    
    // Schedule next rotation
    setTimeout(() => this.rotateKeys(), this.keyRotationInterval);
  }
}
```

## Security Headers and CSP

### 8.1 HTTP Security Headers

```typescript
// Security Headers Middleware
export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // HSTS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Remove server information
  'Server': '',
  'X-Powered-By': ''
};

// Content Security Policy
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Only for development
      'https://cdn.jsdelivr.net',
      'https://unpkg.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:'
    ],
    connectSrc: [
      "'self'",
      process.env.API_URL
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true
  },
  reportOnly: process.env.NODE_ENV !== 'production',
  reportUri: '/api/csp-report'
};
```

## Audit Logging

### 9.1 Comprehensive Audit System

```typescript
// Audit Event Types
export enum AuditEventType {
  // Authentication Events
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  AUTH_MFA_ENABLED = 'AUTH_MFA_ENABLED',
  AUTH_MFA_DISABLED = 'AUTH_MFA_DISABLED',
  
  // Authorization Events
  AUTHZ_ACCESS_GRANTED = 'AUTHZ_ACCESS_GRANTED',
  AUTHZ_ACCESS_DENIED = 'AUTHZ_ACCESS_DENIED',
  AUTHZ_PRIVILEGE_ESCALATION = 'AUTHZ_PRIVILEGE_ESCALATION',
  
  // Data Events
  DATA_CREATE = 'DATA_CREATE',
  DATA_READ = 'DATA_READ',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  
  // Security Events
  SECURITY_BREACH_ATTEMPT = 'SECURITY_BREACH_ATTEMPT',
  SECURITY_RATE_LIMIT_EXCEEDED = 'SECURITY_RATE_LIMIT_EXCEEDED',
  SECURITY_SUSPICIOUS_ACTIVITY = 'SECURITY_SUSPICIOUS_ACTIVITY',
  
  // System Events
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  SYSTEM_BACKUP_CREATED = 'SYSTEM_BACKUP_CREATED',
  SYSTEM_RESTORE_PERFORMED = 'SYSTEM_RESTORE_PERFORMED'
}

// Audit Service
@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService
  ) {}

  async logEvent(event: {
    type: AuditEventType;
    userId?: string;
    resourceId?: string;
    resourceType?: string;
    action?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: event.type,
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      details: event.details ? JSON.stringify(event.details) : null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success ?? true,
      errorMessage: event.errorMessage,
      hash: '' // Will be calculated
    };

    // Calculate integrity hash
    auditEntry.hash = this.calculateAuditHash(auditEntry);

    // Encrypt sensitive details
    if (auditEntry.details) {
      auditEntry.details = await this.encryptionService.encrypt(auditEntry.details);
    }

    await this.prisma.auditLog.create({
      data: auditEntry
    });

    // Send to external SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      await this.sendToSiem(auditEntry);
    }
  }

  private calculateAuditHash(entry: any): string {
    const dataToHash = `${entry.timestamp}${entry.type}${entry.userId}${entry.action}`;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  async verifyAuditIntegrity(entryId: string): Promise<boolean> {
    const entry = await this.prisma.auditLog.findUnique({
      where: { id: entryId }
    });

    if (!entry) return false;

    const calculatedHash = this.calculateAuditHash(entry);
    return calculatedHash === entry.hash;
  }
}
```

## Rate Limiting and DoS Protection

### 10.1 Advanced Rate Limiting

```typescript
// Multi-tier Rate Limiting
export class AdvancedRateLimitService {
  private readonly limits = {
    global: { requests: 1000, window: 60 }, // Global limit
    perUser: { requests: 100, window: 60 }, // Per authenticated user
    perIP: { requests: 50, window: 60 }, // Per IP address
    perEndpoint: {
      login: { requests: 5, window: 900 }, // 5 login attempts per 15 minutes
      register: { requests: 3, window: 3600 }, // 3 registrations per hour
      passwordReset: { requests: 2, window: 3600 }, // 2 password resets per hour
      apiSensitive: { requests: 20, window: 60 } // Sensitive API operations
    }
  };

  async checkRateLimit(request: any): Promise<{ allowed: boolean; retryAfter?: number }> {
    const checks = [
      this.checkGlobalLimit(),
      this.checkPerIPLimit(request.ip),
      this.checkPerUserLimit(request.user?.id),
      this.checkEndpointLimit(request.path, request.ip)
    ];

    const results = await Promise.all(checks);
    const failedCheck = results.find(result => !result.allowed);

    if (failedCheck) {
      await this.logRateLimitViolation(request, failedCheck);
      return failedCheck;
    }

    return { allowed: true };
  }

  private async checkGlobalLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = 'rate_limit:global';
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.limits.global.window);
    }

    if (current > this.limits.global.requests) {
      const ttl = await this.redis.ttl(key);
      return { allowed: false, retryAfter: ttl };
    }

    return { allowed: true };
  }

  // Implement sliding window rate limiting
  private async slidingWindowCheck(key: string, limit: number, window: number): Promise<boolean> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, now - window * 1000);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, window);
    
    const results = await pipeline.exec();
    const count = results[1][1] as number;
    
    return count < limit;
  }
}
```

## Security Monitoring

### 11.1 Real-time Security Monitoring

```typescript
// Security Event Monitor
export class SecurityMonitorService {
  private readonly suspiciousPatterns = {
    rapidFailedLogins: { threshold: 5, window: 300 }, // 5 failures in 5 minutes
    unusualAccessPatterns: { threshold: 0.8 }, // Anomaly score threshold
    massDataExport: { threshold: 1000 }, // Records exported
    privilegeEscalation: { threshold: 1 } // Any attempt
  };

  async analyzeSecurityEvent(event: any): Promise<void> {
    const analyses = [
      this.detectFailedLoginPattern(event),
      this.detectUnusualAccess(event),
      this.detectMassDataExport(event),
      this.detectPrivilegeEscalation(event)
    ];

    const threats = (await Promise.all(analyses)).filter(Boolean);
    
    if (threats.length > 0) {
      await this.triggerSecurityAlert(threats, event);
    }
  }

  private async detectFailedLoginPattern(event: any): Promise<SecurityThreat | null> {
    if (event.type !== AuditEventType.AUTH_LOGIN_FAILURE) {
      return null;
    }

    const key = `failed_logins:${event.ipAddress}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, this.suspiciousPatterns.rapidFailedLogins.window);
    }

    if (count >= this.suspiciousPatterns.rapidFailedLogins.threshold) {
      return {
        type: 'RAPID_FAILED_LOGINS',
        severity: 'HIGH',
        details: { ipAddress: event.ipAddress, attempts: count }
      };
    }

    return null;
  }

  private async triggerSecurityAlert(threats: SecurityThreat[], event: any): Promise<void> {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      threats,
      event,
      severity: this.calculateAlertSeverity(threats),
      status: 'ACTIVE'
    };

    // Store alert
    await this.prisma.securityAlert.create({ data: alert });

    // Trigger automated responses
    await this.executeAutomatedResponse(alert);

    // Notify security team
    await this.notifySecurityTeam(alert);
  }

  private async executeAutomatedResponse(alert: any): Promise<void> {
    switch (alert.severity) {
      case 'CRITICAL':
        await this.temporaryAccountLockout(alert.event.userId);
        await this.blockIPAddress(alert.event.ipAddress);
        break;
      case 'HIGH':
        await this.requireMFAForNextLogin(alert.event.userId);
        await this.increasedMonitoring(alert.event.ipAddress);
        break;
      case 'MEDIUM':
        await this.logAdditionalContext(alert.event);
        break;
    }
  }
}
```

## Configuration Management

### 13.1 Secure Configuration

```typescript
// Environment Configuration
export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET required'); })(),
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  
  // Encryption Configuration
  encryption: {
    masterKey: process.env.ENCRYPTION_KEY || (() => { throw new Error('ENCRYPTION_KEY required'); })(),
    algorithm: 'aes-256-gcm'
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL required'); })(),
    ssl: process.env.NODE_ENV === 'production',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10
  },
  
  // Security Features
  security: {
    mfaRequired: process.env.MFA_REQUIRED === 'true',
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 900, // 15 minutes
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5
  }
};

// Configuration Validation
export class ConfigurationValidator {
  validate(): void {
    const requiredEnvVars = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'DATABASE_URL',
      'SESSION_SECRET'
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate key strengths
    this.validateKeyStrength('JWT_SECRET', process.env.JWT_SECRET, 32);
    this.validateKeyStrength('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY, 32);
    this.validateKeyStrength('SESSION_SECRET', process.env.SESSION_SECRET, 32);
  }

  private validateKeyStrength(name: string, key: string, minLength: number): void {
    if (key.length < minLength) {
      throw new Error(`${name} must be at least ${minLength} characters long`);
    }

    // Check entropy
    const entropy = this.calculateEntropy(key);
    if (entropy < 4.0) {
      console.warn(`Warning: ${name} has low entropy (${entropy.toFixed(2)}). Consider using a more random key.`);
    }
  }

  private calculateEntropy(str: string): number {
    const charCounts = {};
    for (const char of str) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    let entropy = 0;
    const length = str.length;
    
    for (const count of Object.values(charCounts)) {
      const probability = (count as number) / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }
}
```

## Implementation Checklist

### Phase 1: Critical Security (Week 1-2)
- [ ] Implement JWT authentication system
- [ ] Add basic RBAC authorization
- [ ] Deploy HTTPS and security headers
- [ ] Implement input validation
- [ ] Add basic audit logging

### Phase 2: Enhanced Security (Week 3-4)
- [ ] Multi-factor authentication
- [ ] Advanced rate limiting
- [ ] Comprehensive monitoring
- [ ] Data encryption at rest
- [ ] Security testing integration

### Phase 3: Advanced Features (Week 5-6)
- [ ] Biometric authentication support
- [ ] Advanced threat detection
- [ ] Compliance reporting
- [ ] Incident response automation
- [ ] Security analytics dashboard

### Phase 4: Continuous Security (Ongoing)
- [ ] Regular security assessments
- [ ] Vulnerability management
- [ ] Security awareness training
- [ ] Compliance monitoring
- [ ] Continuous improvement

---
*Document Version: 1.0*  
*Last Updated: September 28, 2025*  
*Next Review: October 28, 2025*
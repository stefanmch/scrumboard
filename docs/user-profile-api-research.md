# User Profile API Research & Best Practices

## Executive Summary

This document provides comprehensive research findings and best practices for implementing user profile management endpoints in the NestJS-based Scrumboard application. The research focuses on secure file upload handling, authorization patterns, activity logging, and input validation strategies.

## Project Context

**Framework**: NestJS v11.0.1
**ORM**: Prisma v6.15.0
**Auth**: JWT-based with SimpleJwtAuthGuard
**Database**: PostgreSQL
**Validation**: class-validator v0.14.2
**Documentation**: Swagger/OpenAPI via @nestjs/swagger v8.0.7

**Existing User Model Fields**:
- Core: id, email, name, password, role, avatar
- Status: emailVerified, isActive, lastLoginAt, loginCount, lockedUntil
- Preferences: workingHours, timeZone, notificationPrefs
- Timestamps: createdAt, updatedAt

## Required Endpoints

### 1. GET /users/:id - Get User Profile
### 2. PATCH /users/:id - Update User Profile
### 3. POST /users/:id/avatar - Upload Avatar
### 4. PATCH /users/:id/password - Change Password
### 5. GET /users/:id/activity - User Activity Log

---

## 1. File Upload Handling with Multer

### Package Installation

**Note**: Multer is NOT currently in package.json. Add the following:

```bash
npm install --save multer
npm install --save-dev @types/multer @types/express
```

### Multer Configuration Best Practices

```typescript
// src/users/config/multer.config.ts
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// File size limit: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Upload directory
export const UPLOAD_DIR = './uploads/avatars';

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: userId-timestamp.ext
      const userId = req.user?.userId || 'unknown';
      const timestamp = Date.now();
      const ext = extname(file.originalname);
      const filename = `${userId}-${timestamp}${ext}`;
      cb(null, filename);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Invalid file type. Only JPG and PNG images are allowed.'
        ),
        false
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};
```

### File Validation Interceptor

```typescript
// src/users/interceptors/file-validation.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../config/multer.config';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Additional validation beyond Multer
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPG and PNG images are allowed.'
      );
    }

    // Validate file content (magic number check)
    // This prevents renamed files from bypassing MIME type checks
    const fileSignature = file.buffer?.slice(0, 4).toString('hex');
    const validSignatures = {
      jpeg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
      png: ['89504e47'],
    };

    const isValidSignature =
      validSignatures.jpeg.includes(fileSignature) ||
      validSignatures.png.includes(fileSignature);

    if (!isValidSignature) {
      throw new BadRequestException(
        'File content does not match its extension'
      );
    }

    return next.handle();
  }
}
```

### Avatar Upload Endpoint Implementation

```typescript
// src/users/users.controller.ts
@Post(':id/avatar')
@UseGuards(SimpleJwtAuthGuard, RolesGuard)
@UseInterceptors(
  FileInterceptor('avatar', multerConfig),
  FileValidationInterceptor
)
@ApiBearerAuth('JWT-auth')
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      avatar: {
        type: 'string',
        format: 'binary',
        description: 'Avatar image file (JPG/PNG, max 5MB)',
      },
    },
  },
})
@ApiOperation({ summary: 'Upload user avatar image' })
@ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
@ApiResponse({ status: 400, description: 'Invalid file format or size' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - can only update own avatar' })
async uploadAvatar(
  @Param('id') userId: string,
  @CurrentUser() currentUser: JwtPayload,
  @UploadedFile() file: Express.Multer.File
): Promise<UserResponseDto> {
  // Authorization check
  this.checkUserAccess(userId, currentUser);

  const updatedUser = await this.usersService.updateAvatar(userId, file);
  return new UserResponseDto(updatedUser);
}
```

---

## 2. Authorization Patterns

### Self-Access Guard

Users should only be able to edit their own profile, unless they're an admin.

```typescript
// src/users/guards/user-access.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../../auth/services/jwt.service';

@Injectable()
export class UserAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const targetUserId = request.params.id;

    // Allow if user is accessing their own profile
    if (user.userId === targetUserId) {
      return true;
    }

    // Allow if user has ADMIN role
    if (user.roles?.includes('ADMIN')) {
      return true;
    }

    throw new ForbiddenException(
      'You can only access your own profile'
    );
  }
}
```

### Usage in Controller

```typescript
@Patch(':id')
@UseGuards(SimpleJwtAuthGuard, UserAccessGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Update user profile' })
async updateProfile(
  @Param('id') userId: string,
  @CurrentUser() currentUser: JwtPayload,
  @Body() updateUserDto: UpdateUserDto
): Promise<UserResponseDto> {
  // Guard ensures authorization is already checked
  const updatedUser = await this.usersService.update(userId, updateUserDto);
  return new UserResponseDto(updatedUser);
}
```

### Alternative: Service-Level Authorization

```typescript
// src/users/users.service.ts
async update(
  userId: string,
  updateUserDto: UpdateUserDto,
  currentUser: JwtPayload
): Promise<User> {
  // Check authorization at service level
  if (userId !== currentUser.userId && !currentUser.roles?.includes('ADMIN')) {
    throw new ForbiddenException('You can only update your own profile');
  }

  // Prevent non-admins from changing their role
  if (updateUserDto.role && !currentUser.roles?.includes('ADMIN')) {
    throw new ForbiddenException('Only admins can change user roles');
  }

  return this.prisma.user.update({
    where: { id: userId },
    data: updateUserDto,
  });
}
```

---

## 3. Activity Log Design

### Schema Recommendations

Add a new `UserActivity` model to `schema.prisma`:

```prisma
model UserActivity {
  id          String           @id @default(cuid())
  userId      String
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  action      ActivityAction
  resource    String?          // e.g., "profile", "avatar", "password"
  resourceId  String?          // e.g., userId, taskId, etc.
  details     Json?            // Additional context
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime         @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resource])
  @@map("user_activities")
}

enum ActivityAction {
  PROFILE_UPDATED
  AVATAR_UPLOADED
  PASSWORD_CHANGED
  EMAIL_VERIFIED
  LOGIN
  LOGOUT
  TASK_CREATED
  TASK_UPDATED
  TASK_COMPLETED
  COMMENT_ADDED
  TEAM_JOINED
  TEAM_LEFT
  SPRINT_CREATED
  SPRINT_STARTED
  SPRINT_COMPLETED
}
```

### Activity Logging Service

```typescript
// src/users/services/activity-log.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityAction } from '@prisma/client';

export interface LogActivityDto {
  userId: string;
  action: ActivityAction;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: LogActivityDto) {
    return this.prisma.userActivity.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async getUserActivity(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: ActivityAction;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where = {
      userId,
      ...(options?.action && { action: options.action }),
      ...(options?.startDate && {
        createdAt: {
          gte: options.startDate,
          ...(options?.endDate && { lte: options.endDate }),
        },
      }),
    };

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      activities,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };
  }
}
```

### Activity Logging Interceptor (Automatic)

```typescript
// src/users/interceptors/activity-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityAction } from '@prisma/client';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly activityLogService: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        // Log activity after successful request
        if (user?.userId) {
          const action = this.determineAction(method, url);
          if (action) {
            this.activityLogService.log({
              userId: user.userId,
              action,
              resource: this.extractResource(url),
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            });
          }
        }
      })
    );
  }

  private determineAction(method: string, url: string): ActivityAction | null {
    if (url.includes('/avatar')) return ActivityAction.AVATAR_UPLOADED;
    if (url.includes('/password')) return ActivityAction.PASSWORD_CHANGED;
    if (method === 'PATCH' && url.includes('/users/')) return ActivityAction.PROFILE_UPDATED;
    return null;
  }

  private extractResource(url: string): string {
    if (url.includes('/avatar')) return 'avatar';
    if (url.includes('/password')) return 'password';
    if (url.includes('/users/')) return 'profile';
    return 'unknown';
  }
}
```

### Activity Endpoint Implementation

```typescript
@Get(':id/activity')
@UseGuards(SimpleJwtAuthGuard, UserAccessGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Get user activity log' })
@ApiResponse({
  status: 200,
  description: 'User activity log retrieved',
  schema: {
    type: 'object',
    properties: {
      activities: { type: 'array' },
      total: { type: 'number' },
      limit: { type: 'number' },
      offset: { type: 'number' },
    },
  },
})
async getUserActivity(
  @Param('id') userId: string,
  @CurrentUser() currentUser: JwtPayload,
  @Query('limit') limit?: number,
  @Query('offset') offset?: number,
  @Query('action') action?: ActivityAction,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string
) {
  return this.activityLogService.getUserActivity(userId, {
    limit: Math.min(limit || 50, 100), // Max 100 per request
    offset: offset || 0,
    action,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
}
```

---

## 4. Secure Password Change Workflow

### Password Change DTO

```typescript
// src/users/dto/change-user-password.dto.ts
import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeUserPasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 8 chars, must include uppercase, lowercase, number)',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
```

### Password Change Implementation

```typescript
// src/users/users.service.ts
async changePassword(
  userId: string,
  changePasswordDto: ChangeUserPasswordDto,
  currentUser: JwtPayload
): Promise<void> {
  // Authorization check
  if (userId !== currentUser.userId && !currentUser.roles?.includes('ADMIN')) {
    throw new ForbiddenException('You can only change your own password');
  }

  // Get user with password
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, email: true },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Verify current password
  const isPasswordValid = await this.hashService.compare(
    changePasswordDto.currentPassword,
    user.password
  );

  if (!isPasswordValid) {
    throw new BadRequestException('Current password is incorrect');
  }

  // Ensure new password is different
  const isSamePassword = await this.hashService.compare(
    changePasswordDto.newPassword,
    user.password
  );

  if (isSamePassword) {
    throw new BadRequestException('New password must be different from current password');
  }

  // Hash new password
  const hashedPassword = await this.hashService.hash(changePasswordDto.newPassword);

  // Update password
  await this.prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await this.prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Log activity
  await this.activityLogService.log({
    userId,
    action: ActivityAction.PASSWORD_CHANGED,
    resource: 'password',
  });

  // TODO: Send email notification about password change
}
```

---

## 5. Input Validation Strategies

### Update User Profile DTO

```typescript
// src/users/dto/update-user.dto.ts
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsJSON,
  ValidateNested,
  IsTimeZone,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

class WorkingHoursDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format',
  })
  start: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format',
  })
  end: string;
}

class NotificationPrefsDto {
  @IsOptional()
  email?: boolean;

  @IsOptional()
  push?: boolean;

  @IsOptional()
  taskAssigned?: boolean;

  @IsOptional()
  sprintStarted?: boolean;

  @IsOptional()
  commentMentioned?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({
    description: 'User role (admin only)',
    enum: UserRole,
    example: UserRole.DEVELOPER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Working hours (JSON)',
    example: { start: '09:00', end: '17:00' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsTimeZone()
  timeZone?: string;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: {
      email: true,
      push: false,
      taskAssigned: true,
      sprintStarted: true,
      commentMentioned: true,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPrefsDto)
  notificationPrefs?: NotificationPrefsDto;
}
```

### Custom Validation Pipes

```typescript
// src/common/pipes/validate-user-id.pipe.ts
import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ValidateUserIdPipe implements PipeTransform {
  transform(value: string): string {
    // Validate CUID format (Prisma default ID format)
    const cuidRegex = /^c[a-z0-9]{24}$/i;

    if (!cuidRegex.test(value)) {
      throw new BadRequestException('Invalid user ID format');
    }

    return value;
  }
}
```

### Usage in Controller

```typescript
@Get(':id')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Get user profile by ID' })
async getUserProfile(
  @Param('id', ValidateUserIdPipe) userId: string,
  @CurrentUser() currentUser: JwtPayload
): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(userId);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return new UserResponseDto(user);
}
```

---

## 6. API Documentation with Swagger

### Response DTOs

```typescript
// src/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: 'clh1234567890abcdef' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatars/user-123.jpg' })
  avatar?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DEVELOPER })
  role: UserRole;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2025-10-15T10:30:00.000Z' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({
    example: { start: '09:00', end: '17:00' },
  })
  workingHours?: any;

  @ApiPropertyOptional({ example: 'America/New_York' })
  timeZone?: string;

  @ApiPropertyOptional({
    example: { email: true, push: false },
  })
  notificationPrefs?: any;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-15T10:30:00.000Z' })
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
```

### Swagger Configuration

```typescript
// src/main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Scrumboard API')
  .setDescription('API for Scrumboard project management')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth'
  )
  .addTag('users', 'User profile management endpoints')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## 7. Security Considerations

### Rate Limiting

Apply throttling to sensitive endpoints:

```typescript
@Patch(':id/password')
@UseGuards(SimpleJwtAuthGuard, UserAccessGuard)
@Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
@ApiBearerAuth('JWT-auth')
async changePassword(/*...*/) {
  // Implementation
}
```

### File Upload Security

1. **MIME type validation**: Check file headers, not just extensions
2. **File size limits**: Enforce maximum file size (5MB)
3. **Virus scanning**: Consider integrating ClamAV for production
4. **Storage location**: Store outside webroot or use cloud storage (S3)
5. **Filename sanitization**: Never use user-provided filenames directly

### Password Security

1. **Current password verification**: Always require current password
2. **Password complexity**: Enforce strong password rules
3. **Session invalidation**: Revoke all tokens after password change
4. **Email notifications**: Alert user of password changes
5. **Rate limiting**: Prevent brute force attempts

### Authorization Security

1. **Guard-level checks**: Use guards for route-level authorization
2. **Service-level checks**: Add authorization in service methods as defense-in-depth
3. **Admin-only fields**: Prevent users from escalating privileges
4. **Resource ownership**: Verify user owns the resource being modified

---

## 8. Testing Strategy

### Unit Tests

```typescript
// src/users/users.service.spec.ts
describe('UsersService', () => {
  describe('update', () => {
    it('should allow user to update their own profile', async () => {
      const user = { userId: 'user1', roles: ['MEMBER'] };
      const updateDto = { name: 'New Name' };

      const result = await service.update('user1', updateDto, user);

      expect(result.name).toBe('New Name');
    });

    it('should prevent user from updating another user profile', async () => {
      const user = { userId: 'user1', roles: ['MEMBER'] };
      const updateDto = { name: 'New Name' };

      await expect(
        service.update('user2', updateDto, user)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any user profile', async () => {
      const admin = { userId: 'admin1', roles: ['ADMIN'] };
      const updateDto = { role: UserRole.DEVELOPER };

      const result = await service.update('user2', updateDto, admin);

      expect(result.role).toBe(UserRole.DEVELOPER);
    });

    it('should prevent non-admin from changing role', async () => {
      const user = { userId: 'user1', roles: ['MEMBER'] };
      const updateDto = { role: UserRole.ADMIN };

      await expect(
        service.update('user1', updateDto, user)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const changeDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      await expect(
        service.changePassword('user1', changeDto, { userId: 'user1' })
      ).resolves.not.toThrow();
    });

    it('should reject invalid current password', async () => {
      const changeDto = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!',
      };

      await expect(
        service.changePassword('user1', changeDto, { userId: 'user1' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject same password as new password', async () => {
      const changeDto = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
      };

      await expect(
        service.changePassword('user1', changeDto, { userId: 'user1' })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

### E2E Tests

```typescript
// test/users.e2e-spec.ts
describe('Users API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup and login
  });

  describe('PATCH /users/:id', () => {
    it('should update own profile', () => {
      return request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
        });
    });

    it('should prevent updating other user profile', () => {
      return request(app.getHttpServer())
        .patch('/users/other-user-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });
  });

  describe('POST /users/:id/avatar', () => {
    it('should upload valid avatar', () => {
      return request(app.getHttpServer())
        .post(`/users/${userId}/avatar`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', './test/fixtures/avatar.jpg')
        .expect(200);
    });

    it('should reject invalid file type', () => {
      return request(app.getHttpServer())
        .post(`/users/${userId}/avatar`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', './test/fixtures/document.pdf')
        .expect(400);
    });

    it('should reject oversized file', () => {
      return request(app.getHttpServer())
        .post(`/users/${userId}/avatar`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', './test/fixtures/large-image.jpg') // > 5MB
        .expect(400);
    });
  });

  describe('GET /users/:id/activity', () => {
    it('should get own activity log', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}/activity`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.activities).toBeInstanceOf(Array);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}/activity?limit=10&offset=5`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(10);
          expect(res.body.offset).toBe(5);
        });
    });

    it('should filter by action type', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}/activity?action=PROFILE_UPDATED`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.activities.forEach((activity) => {
            expect(activity.action).toBe('PROFILE_UPDATED');
          });
        });
    });
  });
});
```

---

## 9. Implementation Checklist

### Prerequisites
- [ ] Add Multer packages: `npm install multer @types/multer`
- [ ] Create UserActivity model in schema.prisma
- [ ] Run Prisma migration: `npx prisma migrate dev`
- [ ] Create uploads/avatars directory

### User Module Structure
- [ ] Create `src/users/users.module.ts`
- [ ] Create `src/users/users.controller.ts`
- [ ] Create `src/users/users.service.ts`
- [ ] Create `src/users/config/multer.config.ts`

### DTOs
- [ ] Create `src/users/dto/update-user.dto.ts`
- [ ] Create `src/users/dto/change-user-password.dto.ts`
- [ ] Create `src/users/dto/user-response.dto.ts`
- [ ] Create `src/users/dto/user-activity-response.dto.ts`

### Guards & Interceptors
- [ ] Create `src/users/guards/user-access.guard.ts`
- [ ] Create `src/users/interceptors/file-validation.interceptor.ts`
- [ ] Create `src/users/interceptors/activity-log.interceptor.ts`

### Services
- [ ] Create `src/users/services/activity-log.service.ts`
- [ ] Implement avatar upload logic in users.service.ts
- [ ] Implement password change logic in users.service.ts

### Endpoints
- [ ] Implement GET /users/:id
- [ ] Implement PATCH /users/:id
- [ ] Implement POST /users/:id/avatar
- [ ] Implement PATCH /users/:id/password
- [ ] Implement GET /users/:id/activity

### Testing
- [ ] Write unit tests for UsersService
- [ ] Write unit tests for UserAccessGuard
- [ ] Write unit tests for ActivityLogService
- [ ] Write E2E tests for all endpoints
- [ ] Test file upload with various file types and sizes
- [ ] Test authorization scenarios (own profile, other users, admin)

### Documentation
- [ ] Add Swagger decorators to all endpoints
- [ ] Document request/response schemas
- [ ] Add examples to Swagger UI
- [ ] Update API documentation

---

## 10. Code Examples Summary

### Complete Controller Implementation

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ActivityLogService } from './services/activity-log.service';
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserAccessGuard } from './guards/user-access.guard';
import { FileValidationInterceptor } from './interceptors/file-validation.interceptor';
import { ActivityLogInterceptor } from './interceptors/activity-log.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UpdateUserDto,
  ChangeUserPasswordDto,
  UserResponseDto,
} from './dto';
import { multerConfig } from './config/multer.config';
import { ValidateUserIdPipe } from '../common/pipes/validate-user-id.pipe';
import { JwtPayload } from '../auth/services/jwt.service';
import { ActivityAction } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(SimpleJwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService
  ) {}

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(
    @Param('id', ValidateUserIdPipe) userId: string
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(userId);
    return new UserResponseDto(user);
  }

  @Patch(':id')
  @UseGuards(UserAccessGuard)
  @UseInterceptors(ActivityLogInterceptor)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Param('id', ValidateUserIdPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(
      userId,
      updateUserDto,
      currentUser
    );
    return new UserResponseDto(updatedUser);
  }

  @Post(':id/avatar')
  @UseGuards(UserAccessGuard)
  @UseInterceptors(
    FileInterceptor('avatar', multerConfig),
    FileValidationInterceptor,
    ActivityLogInterceptor
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPG/PNG, max 5MB)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload user avatar image' })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own avatar' })
  async uploadAvatar(
    @Param('id', ValidateUserIdPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
    @UploadedFile() file: Express.Multer.File
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.updateAvatar(userId, file);
    return new UserResponseDto(updatedUser);
  }

  @Patch(':id/password')
  @UseGuards(UserAccessGuard)
  @UseInterceptors(ActivityLogInterceptor)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only change own password' })
  async changePassword(
    @Param('id', ValidateUserIdPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Body() changePasswordDto: ChangeUserPasswordDto
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(userId, changePasswordDto, currentUser);
    return { message: 'Password changed successfully' };
  }

  @Get(':id/activity')
  @UseGuards(UserAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ActivityAction,
    example: ActivityAction.PROFILE_UPDATED,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31' })
  @ApiResponse({
    status: 200,
    description: 'User activity log retrieved',
    schema: {
      type: 'object',
      properties: {
        activities: { type: 'array' },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only view own activity' })
  async getUserActivity(
    @Param('id', ValidateUserIdPipe) userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('action') action?: ActivityAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.activityLogService.getUserActivity(userId, {
      limit: Math.min(limit, 100), // Max 100 per request
      offset,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
```

---

## Conclusion

This research document provides comprehensive best practices and implementation patterns for building secure, maintainable user profile management endpoints in the NestJS Scrumboard application. Key takeaways:

1. **Security First**: Implement proper authorization, file validation, and password security
2. **Validation**: Use class-validator extensively with custom pipes for complex validation
3. **Activity Logging**: Track all user actions for audit trails and user insights
4. **Documentation**: Leverage Swagger for comprehensive API documentation
5. **Testing**: Write thorough unit and E2E tests for all endpoints
6. **Error Handling**: Provide clear, actionable error messages
7. **Rate Limiting**: Protect sensitive endpoints from abuse

All patterns follow NestJS best practices and integrate seamlessly with the existing authentication and authorization infrastructure.

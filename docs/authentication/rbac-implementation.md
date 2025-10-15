# RBAC Implementation Guide

## Table of Contents
1. [NestJS Backend Implementation](#nestjs-backend-implementation)
2. [Database Layer](#database-layer)
3. [React Frontend Components](#react-frontend-components)
4. [Permission Middleware](#permission-middleware)
5. [Testing Strategies](#testing-strategies)
6. [Performance Optimization](#performance-optimization)

## NestJS Backend Implementation

### 1. Core Permission Service

```typescript
// src/auth/services/permission.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';

export interface PermissionContext {
  user: User;
  resource?: {
    type: string;
    id: string;
    data?: any;
  };
  action: string;
  additionalContext?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    try {
      // 1. Load user roles with scope context
      const userRoles = await this.getUserRolesInContext(
        context.user.id,
        context.resource
      );

      if (userRoles.length === 0) {
        return {
          granted: false,
          reason: 'No roles assigned to user',
        };
      }

      // 2. Check role-based permissions
      const rolePermissions = await this.getRolePermissions(
        userRoles,
        context.action,
        context.resource?.type
      );

      // 3. Check delegated permissions
      const delegatedPermissions = await this.getDelegatedPermissions(
        context.user.id,
        context.action,
        context.resource
      );

      // 4. Combine all permissions
      const allPermissions = [...rolePermissions, ...delegatedPermissions];

      if (allPermissions.length === 0) {
        return {
          granted: false,
          reason: 'No matching permissions found',
        };
      }

      // 5. Evaluate conditional permissions
      const result = await this.evaluateConditionalPermissions(
        allPermissions,
        context
      );

      // 6. Log permission check for audit
      await this.auditPermissionCheck(context, result);

      return result;
    } catch (error) {
      this.logger.error('Permission check failed', error);
      return {
        granted: false,
        reason: 'Permission check error',
        metadata: { error: error.message },
      };
    }
  }

  private async getUserRolesInContext(
    userId: string,
    resource?: { type: string; id: string }
  ): Promise<UserRole[]> {
    const query = this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', {
        now: new Date(),
      });

    if (resource) {
      query.andWhere(
        '(ur.scopeType = :globalScope OR ' +
        '(ur.scopeType = :resourceScope AND ur.scopeResourceId = :resourceId))',
        {
          globalScope: 'GLOBAL',
          resourceScope: resource.type.toUpperCase(),
          resourceId: resource.id,
        }
      );
    }

    return query.getMany();
  }

  private async getRolePermissions(
    userRoles: UserRole[],
    action: string,
    resourceType?: string
  ): Promise<Permission[]> {
    const roleIds = userRoles.map(ur => ur.role.id);

    return this.permissionRepository
      .createQueryBuilder('p')
      .innerJoin('role_permissions', 'rp', 'rp.permissionId = p.id')
      .where('rp.roleId IN (:...roleIds)', { roleIds })
      .andWhere('rp.granted = true')
      .andWhere('p.action = :action', { action })
      .andWhere(
        resourceType ? 'p.resourceType = :resourceType' : '1=1',
        { resourceType }
      )
      .getMany();
  }

  private async getDelegatedPermissions(
    userId: string,
    action: string,
    resource?: { type: string; id: string }
  ): Promise<Permission[]> {
    // Implementation for delegated permissions
    // Similar query structure but for permission_delegations table
    return [];
  }

  private async evaluateConditionalPermissions(
    permissions: Permission[],
    context: PermissionContext
  ): Promise<PermissionResult> {
    for (const permission of permissions) {
      if (!permission.conditionExpression) {
        // Unconditional permission granted
        return {
          granted: true,
          reason: `Permission granted by role: ${permission.name}`,
        };
      }

      // Evaluate condition expression
      const conditionMet = await this.evaluateCondition(
        permission.conditionExpression,
        context
      );

      if (conditionMet) {
        return {
          granted: true,
          reason: `Conditional permission granted: ${permission.name}`,
          conditions: [permission.conditionExpression],
        };
      }
    }

    return {
      granted: false,
      reason: 'No permissions matched the current context',
    };
  }

  private async evaluateCondition(
    expression: string,
    context: PermissionContext
  ): Promise<boolean> {
    // Simple expression evaluator
    // In production, use a proper expression engine like JsonLogic

    const variables = {
      user: context.user,
      resource: context.resource,
      ...context.additionalContext,
    };

    // Example conditions:
    // "user.id === resource.ownerId"
    // "user.teamIds.includes(resource.teamId)"
    // "resource.status === 'DRAFT'"

    try {
      // WARNING: eval is dangerous - use a proper expression evaluator in production
      // This is just for demonstration
      return this.safeEvaluateExpression(expression, variables);
    } catch (error) {
      this.logger.warn(`Condition evaluation failed: ${expression}`, error);
      return false;
    }
  }

  private safeEvaluateExpression(expression: string, variables: any): boolean {
    // Implement a safe expression evaluator
    // Consider using libraries like:
    // - @typescript-eslint/utils for AST parsing
    // - JsonLogic for rule evaluation
    // - vm2 for sandboxed execution

    // For now, implement basic checks
    if (expression.includes('user.id === resource.ownerId')) {
      return variables.user?.id === variables.resource?.data?.ownerId;
    }

    if (expression.includes('user.teamIds.includes(resource.teamId)')) {
      return variables.user?.teamIds?.includes(variables.resource?.data?.teamId);
    }

    return false;
  }

  private async auditPermissionCheck(
    context: PermissionContext,
    result: PermissionResult
  ): Promise<void> {
    // Log to audit table for compliance and security monitoring
    // Implementation depends on your audit logging strategy
  }
}
```

### 2. Permission Guards

```typescript
// src/auth/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService, PermissionContext } from '../services/permission.service';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: string;
  resource?: string;
  condition?: string;
}

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract resource information from request
    const resource = this.extractResourceFromRequest(request);

    for (const permission of requiredPermissions) {
      const permissionContext: PermissionContext = {
        user,
        resource: resource || { type: permission.resource || 'SYSTEM', id: 'GLOBAL' },
        action: permission.action,
        additionalContext: {
          ip: request.ip,
          userAgent: request.get('User-Agent'),
          method: request.method,
          url: request.url,
        },
      };

      const result = await this.permissionService.checkPermission(permissionContext);

      if (!result.granted) {
        throw new ForbiddenException(
          `Access denied: ${result.reason || 'Insufficient permissions'}`
        );
      }
    }

    return true;
  }

  private extractResourceFromRequest(request: any): { type: string; id: string; data?: any } | null {
    // Extract resource information from route parameters
    const { params, body } = request;

    if (params.projectId) {
      return {
        type: 'PROJECT',
        id: params.projectId,
        data: { ...params, ...body },
      };
    }

    if (params.teamId) {
      return {
        type: 'TEAM',
        id: params.teamId,
        data: { ...params, ...body },
      };
    }

    if (params.sprintId) {
      return {
        type: 'SPRINT',
        id: params.sprintId,
        data: { ...params, ...body },
      };
    }

    return null;
  }
}
```

### 3. Permission Decorators

```typescript
// src/auth/decorators/permissions.decorator.ts
import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionConfig {
  action: string;
  resource?: string;
  condition?: string;
  scope?: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT' | 'TEAM';
}

export const RequirePermissions = (...permissions: PermissionConfig[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Convenience decorators for common patterns
export const RequireAdmin = () => RequirePermissions({ action: 'MANAGE', resource: 'SYSTEM' });

export const RequireProjectAccess = (action: string) =>
  RequirePermissions({ action, resource: 'PROJECT' });

export const RequireTeamAccess = (action: string) =>
  RequirePermissions({ action, resource: 'TEAM' });

export const RequireOwnResource = (action: string, resourceType: string) =>
  RequirePermissions({
    action,
    resource: resourceType,
    condition: 'user.id === resource.ownerId',
  });

// Field-level permission decorator
export const RequireFieldAccess = (field: string, permission: 'READ' | 'WRITE') =>
  SetMetadata('field_permissions', { field, permission });
```

### 4. Controller Implementation Example

```typescript
// src/projects/projects.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions, RequireProjectAccess } from '../auth/decorators/permissions.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions({ action: 'CREATE', resource: 'PROJECT' })
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @RequirePermissions({ action: 'READ', resource: 'PROJECT' })
  async getAllProjects() {
    return this.projectsService.findAll();
  }

  @Get(':projectId')
  @RequireProjectAccess('READ')
  async getProject(@Param('projectId') projectId: string) {
    return this.projectsService.findOne(projectId);
  }

  @Put(':projectId')
  @RequireProjectAccess('UPDATE')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(projectId, updateProjectDto);
  }

  @Delete(':projectId')
  @RequirePermissions({
    action: 'DELETE',
    resource: 'PROJECT',
    condition: 'user.role === "ADMIN" || user.id === resource.ownerId',
  })
  async deleteProject(@Param('projectId') projectId: string) {
    return this.projectsService.remove(projectId);
  }

  @Post(':projectId/members')
  @RequirePermissions({ action: 'MANAGE_MEMBERS', resource: 'PROJECT' })
  async addProjectMember(
    @Param('projectId') projectId: string,
    @Body() memberDto: any,
  ) {
    return this.projectsService.addMember(projectId, memberDto);
  }

  @Get(':projectId/reports')
  @RequirePermissions({ action: 'VIEW_REPORTS', resource: 'PROJECT' })
  async getProjectReports(@Param('projectId') projectId: string) {
    return this.projectsService.getReports(projectId);
  }
}
```

## Database Layer

### 1. Entity Definitions

```typescript
// src/auth/entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { UserRole } from './user-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  level: number; // For hierarchy

  @Column({ default: false })
  isSystemRole: boolean;

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
  permissions: RolePermission[];

  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles: UserRole[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/auth/entities/permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  resourceType: string;

  @Column({ length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  conditionExpression: string;

  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;
}

// src/auth/entities/user-role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from './role.entity';

export enum ScopeType {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
  TEAM = 'TEAM',
}

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  roleId: string;

  @Column({
    type: 'enum',
    enum: ScopeType,
  })
  scopeType: ScopeType;

  @Column({ nullable: true })
  scopeResourceId: string;

  @Column({ nullable: true })
  assignedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 2. Repository Extensions

```typescript
// src/auth/repositories/user-role.repository.ts
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole, ScopeType } from '../entities/user-role.entity';

@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectRepository(UserRole)
    private repository: Repository<UserRole>,
  ) {}

  async findUserRolesInScope(
    userId: string,
    scopeType?: ScopeType,
    scopeResourceId?: string,
  ): Promise<UserRole[]> {
    const query = this.repository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', {
        now: new Date(),
      });

    if (scopeType) {
      query.andWhere('ur.scopeType = :scopeType', { scopeType });
    }

    if (scopeResourceId) {
      query.andWhere('ur.scopeResourceId = :scopeResourceId', { scopeResourceId });
    }

    return query.getMany();
  }

  async findEffectiveRoles(userId: string, resourceType?: string, resourceId?: string): Promise<UserRole[]> {
    const query = this.repository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now: new Date() });

    if (resourceType && resourceId) {
      query.andWhere(
        '(ur.scopeType = :globalScope OR ' +
        '(ur.scopeType = :resourceScope AND ur.scopeResourceId = :resourceId))',
        {
          globalScope: ScopeType.GLOBAL,
          resourceScope: resourceType.toUpperCase(),
          resourceId,
        }
      );
    }

    return query
      .orderBy('role.level', 'DESC') // Higher level roles first
      .getMany();
  }

  async hasRole(userId: string, roleName: string, scope?: { type: ScopeType; resourceId?: string }): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('ur')
      .leftJoin('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('role.name = :roleName', { roleName })
      .andWhere('ur.isActive = true')
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now: new Date() });

    if (scope) {
      query.andWhere('ur.scopeType = :scopeType', { scopeType: scope.type });
      if (scope.resourceId) {
        query.andWhere('ur.scopeResourceId = :resourceId', { resourceId: scope.resourceId });
      }
    }

    const count = await query.getCount();
    return count > 0;
  }
}
```

## React Frontend Components

### 1. Permission Context Provider

```typescript
// src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types/user.types';
import { permissionService } from '../services/permission.service';

export interface PermissionContextType {
  user: User | null;
  permissions: Set<string>;
  checkPermission: (action: string, resource?: string, resourceId?: string) => boolean;
  hasRole: (roleName: string, scope?: string) => boolean;
  canAccess: (component: string) => boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  user: User | null;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children, user }) => {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refreshPermissions = async () => {
    if (!user) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userPermissions = await permissionService.getUserPermissions(user.id);
      setPermissions(new Set(userPermissions));
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [user]);

  const checkPermission = (action: string, resource?: string, resourceId?: string): boolean => {
    if (!user) return false;

    const permissionKey = resource ? `${resource}.${action}` : action;

    // Check direct permission
    if (permissions.has(permissionKey)) return true;

    // Check resource-specific permission
    if (resourceId) {
      const specificPermission = `${permissionKey}:${resourceId}`;
      if (permissions.has(specificPermission)) return true;
    }

    // Check wildcard permissions
    const wildcardPermission = resource ? `${resource}.*` : '*';
    return permissions.has(wildcardPermission);
  };

  const hasRole = (roleName: string, scope?: string): boolean => {
    if (!user) return false;

    const roleKey = scope ? `role:${roleName}:${scope}` : `role:${roleName}`;
    return permissions.has(roleKey);
  };

  const canAccess = (component: string): boolean => {
    // Component-specific access rules
    switch (component) {
      case 'AdminPanel':
        return hasRole('ADMIN') || hasRole('SUPER_ADMIN');
      case 'UserManagement':
        return hasRole('ADMIN') || hasRole('SUPER_ADMIN');
      case 'ProjectSettings':
        return hasRole('ADMIN') || hasRole('SCRUM_MASTER') || hasRole('PRODUCT_OWNER');
      case 'Reports':
        return checkPermission('VIEW_REPORTS');
      default:
        return true;
    }
  };

  const contextValue: PermissionContextType = {
    user,
    permissions,
    checkPermission,
    hasRole,
    canAccess,
    isLoading,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
```

### 2. Permission-Based Component Wrapper

```typescript
// src/components/auth/PermissionGate.tsx
import React, { ReactNode } from 'react';
import { usePermissions } from '../../contexts/PermissionContext';

export interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  resource?: string;
  resourceId?: string;
  role?: string;
  scope?: string;
  component?: string;
  fallback?: ReactNode;
  requireAll?: boolean; // Require all permissions vs any permission
  permissions?: string[];
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  resource,
  resourceId,
  role,
  scope,
  component,
  fallback = null,
  requireAll = false,
  permissions = [],
}) => {
  const { checkPermission, hasRole, canAccess } = usePermissions();

  const hasAccess = (): boolean => {
    // Check component access
    if (component) {
      return canAccess(component);
    }

    // Check role access
    if (role) {
      return hasRole(role, scope);
    }

    // Check single permission
    if (permission) {
      return checkPermission(permission, resource, resourceId);
    }

    // Check multiple permissions
    if (permissions.length > 0) {
      if (requireAll) {
        return permissions.every(perm => checkPermission(perm, resource, resourceId));
      } else {
        return permissions.some(perm => checkPermission(perm, resource, resourceId));
      }
    }

    // Default to no access if no conditions specified
    return false;
  };

  if (!hasAccess()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common patterns
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate role="ADMIN" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const ScrumMasterOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate role="SCRUM_MASTER" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const TeamMemberOnly: React.FC<{ children: ReactNode; scope?: string; fallback?: ReactNode }> = ({
  children,
  scope,
  fallback,
}) => (
  <PermissionGate permissions={['DEVELOPER', 'SCRUM_MASTER', 'PRODUCT_OWNER']} scope={scope} fallback={fallback}>
    {children}
  </PermissionGate>
);
```

### 3. Permission Hooks

```typescript
// src/hooks/usePermission.ts
import { usePermissions } from '../contexts/PermissionContext';
import { useMemo } from 'react';

export interface UsePermissionOptions {
  resource?: string;
  resourceId?: string;
  scope?: string;
}

export const usePermission = (permission: string, options?: UsePermissionOptions) => {
  const { checkPermission } = usePermissions();

  return useMemo(() => {
    return checkPermission(permission, options?.resource, options?.resourceId);
  }, [permission, options?.resource, options?.resourceId, checkPermission]);
};

export const useRole = (roleName: string, scope?: string) => {
  const { hasRole } = usePermissions();

  return useMemo(() => {
    return hasRole(roleName, scope);
  }, [roleName, scope, hasRole]);
};

export const useCanAccess = (component: string) => {
  const { canAccess } = usePermissions();

  return useMemo(() => {
    return canAccess(component);
  }, [component, canAccess]);
};

// Convenience hooks for common roles
export const useIsAdmin = () => useRole('ADMIN');
export const useIsScrumMaster = () => useRole('SCRUM_MASTER');
export const useIsProductOwner = () => useRole('PRODUCT_OWNER');
export const useIsDeveloper = () => useRole('DEVELOPER');

// Permission hooks for common actions
export const useCanCreateProject = () => usePermission('CREATE', { resource: 'PROJECT' });
export const useCanManageTeam = (teamId?: string) => usePermission('MANAGE', { resource: 'TEAM', resourceId: teamId });
export const useCanViewReports = () => usePermission('VIEW_REPORTS');
export const useCanExportData = () => usePermission('EXPORT');
```

### 4. Form Field Protection

```typescript
// src/components/forms/ProtectedField.tsx
import React, { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';

export interface ProtectedFieldProps {
  children: ReactNode;
  fieldName: string;
  resourceType: string;
  resourceId?: string;
  readOnly?: boolean;
  hideWhenNoAccess?: boolean;
  fallback?: ReactNode;
}

export const ProtectedField: React.FC<ProtectedFieldProps> = ({
  children,
  fieldName,
  resourceType,
  resourceId,
  readOnly = false,
  hideWhenNoAccess = false,
  fallback = null,
}) => {
  const canRead = usePermission(`READ_FIELD_${fieldName.toUpperCase()}`, {
    resource: resourceType,
    resourceId,
  });

  const canWrite = usePermission(`WRITE_FIELD_${fieldName.toUpperCase()}`, {
    resource: resourceType,
    resourceId,
  });

  if (!canRead) {
    if (hideWhenNoAccess) {
      return null;
    }
    return <>{fallback}</>;
  }

  if (readOnly || !canWrite) {
    // Clone children and make them read-only
    return React.cloneElement(children as React.ReactElement, {
      disabled: true,
      readOnly: true,
    });
  }

  return <>{children}</>;
};

// Example usage component
export const UserProfileForm: React.FC<{ userId: string }> = ({ userId }) => {
  return (
    <form>
      <ProtectedField
        fieldName="email"
        resourceType="USER"
        resourceId={userId}
      >
        <input type="email" name="email" />
      </ProtectedField>

      <ProtectedField
        fieldName="salary"
        resourceType="USER"
        resourceId={userId}
        hideWhenNoAccess={true}
        fallback={<div>*** Hidden ***</div>}
      >
        <input type="number" name="salary" />
      </ProtectedField>

      <ProtectedField
        fieldName="role"
        resourceType="USER"
        resourceId={userId}
        readOnly={true}
      >
        <select name="role">
          <option value="DEVELOPER">Developer</option>
          <option value="SCRUM_MASTER">Scrum Master</option>
        </select>
      </ProtectedField>
    </form>
  );
};
```

### 5. Navigation Menu with Permissions

```typescript
// src/components/navigation/PermissionAwareNavigation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionContext';
import { PermissionGate } from '../auth/PermissionGate';

export interface NavItem {
  label: string;
  path: string;
  permission?: string;
  role?: string;
  component?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
  },
  {
    label: 'Projects',
    path: '/projects',
    permission: 'READ',
    children: [
      {
        label: 'Create Project',
        path: '/projects/create',
        permission: 'CREATE',
      },
      {
        label: 'My Projects',
        path: '/projects/mine',
        permission: 'READ',
      },
    ],
  },
  {
    label: 'Teams',
    path: '/teams',
    permission: 'READ',
    children: [
      {
        label: 'Manage Teams',
        path: '/teams/manage',
        role: 'SCRUM_MASTER',
      },
      {
        label: 'Team Performance',
        path: '/teams/performance',
        permission: 'VIEW_REPORTS',
      },
    ],
  },
  {
    label: 'Reports',
    path: '/reports',
    permission: 'VIEW_REPORTS',
    children: [
      {
        label: 'Team Reports',
        path: '/reports/team',
        permission: 'VIEW_DETAILED_REPORTS',
      },
      {
        label: 'Financial Reports',
        path: '/reports/financial',
        permission: 'VIEW_FINANCIAL_REPORTS',
      },
    ],
  },
  {
    label: 'Administration',
    path: '/admin',
    component: 'AdminPanel',
    children: [
      {
        label: 'User Management',
        path: '/admin/users',
        component: 'UserManagement',
      },
      {
        label: 'System Settings',
        path: '/admin/settings',
        permission: 'MANAGE_SYSTEM',
      },
    ],
  },
];

const NavItemComponent: React.FC<{ item: NavItem; level?: number }> = ({ item, level = 0 }) => {
  const renderNavItem = () => (
    <div className={`nav-item level-${level}`}>
      <Link to={item.path} className="nav-link">
        {item.label}
      </Link>
      {item.children && (
        <div className="nav-children">
          {item.children.map((child, index) => (
            <NavItemComponent key={index} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );

  if (item.permission) {
    return (
      <PermissionGate permission={item.permission}>
        {renderNavItem()}
      </PermissionGate>
    );
  }

  if (item.role) {
    return (
      <PermissionGate role={item.role}>
        {renderNavItem()}
      </PermissionGate>
    );
  }

  if (item.component) {
    return (
      <PermissionGate component={item.component}>
        {renderNavItem()}
      </PermissionGate>
    );
  }

  return renderNavItem();
};

export const PermissionAwareNavigation: React.FC = () => {
  return (
    <nav className="main-navigation">
      {navigationItems.map((item, index) => (
        <NavItemComponent key={index} item={item} />
      ))}
    </nav>
  );
};
```

## Permission Middleware

### 1. Request Context Middleware

```typescript
// src/auth/middleware/permission-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';

export interface PermissionRequest extends Request {
  permissionContext?: {
    checkPermission: (action: string, resource?: string) => Promise<boolean>;
    hasRole: (roleName: string, scope?: string) => Promise<boolean>;
    effectivePermissions: Set<string>;
  };
}

@Injectable()
export class PermissionContextMiddleware implements NestMiddleware {
  constructor(private readonly permissionService: PermissionService) {}

  async use(req: PermissionRequest, res: Response, next: NextFunction) {
    if (req.user) {
      const effectivePermissions = await this.loadEffectivePermissions(req.user);

      req.permissionContext = {
        checkPermission: async (action: string, resource?: string) => {
          const result = await this.permissionService.checkPermission({
            user: req.user,
            action,
            resource: resource ? { type: resource, id: 'CONTEXT' } : undefined,
            additionalContext: {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
            },
          });
          return result.granted;
        },

        hasRole: async (roleName: string, scope?: string) => {
          return this.checkUserRole(req.user, roleName, scope);
        },

        effectivePermissions,
      };
    }

    next();
  }

  private async loadEffectivePermissions(user: any): Promise<Set<string>> {
    // Load and cache user's effective permissions
    // Implementation depends on your caching strategy
    return new Set();
  }

  private async checkUserRole(user: any, roleName: string, scope?: string): Promise<boolean> {
    // Check if user has specific role in scope
    return false;
  }
}
```

### 2. Performance Optimization Middleware

```typescript
// src/auth/middleware/permission-cache.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';

@Injectable()
export class PermissionCacheMiddleware implements NestMiddleware {
  constructor(private readonly cacheService: CacheService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
      // Pre-load and cache frequently used permissions
      const cacheKey = `user_permissions:${req.user.id}`;

      let userPermissions = await this.cacheService.get(cacheKey);

      if (!userPermissions) {
        userPermissions = await this.loadUserPermissions(req.user.id);
        await this.cacheService.set(cacheKey, userPermissions, 300); // 5 minutes TTL
      }

      // Attach cached permissions to request for fast access
      req.user.cachedPermissions = userPermissions;
    }

    next();
  }

  private async loadUserPermissions(userId: string): Promise<any> {
    // Load user permissions from database
    return {};
  }
}
```

## Testing Strategies

### 1. Permission Service Tests

```typescript
// src/auth/services/__tests__/permission.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionService } from '../permission.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { UserRole } from '../../entities/user-role.entity';

describe('PermissionService', () => {
  let service: PermissionService;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let permissionRepository: Repository<Permission>;
  let userRoleRepository: Repository<UserRole>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Role),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Permission),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserRole),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepository = module.get<Repository<Permission>>(getRepositoryToken(Permission));
    userRoleRepository = module.get<Repository<UserRole>>(getRepositoryToken(UserRole));
  });

  describe('checkPermission', () => {
    it('should grant permission for admin user', async () => {
      // Mock admin user with all permissions
      const mockUser = {
        id: 'admin-1',
        roles: [{ name: 'ADMIN', level: 5 }],
      };

      const context = {
        user: mockUser,
        action: 'CREATE',
        resource: { type: 'PROJECT', id: 'project-1' },
      };

      // Mock repository methods
      jest.spyOn(service as any, 'getUserRolesInContext').mockResolvedValue([
        { role: { name: 'ADMIN', level: 5 } },
      ]);

      jest.spyOn(service as any, 'getRolePermissions').mockResolvedValue([
        { name: 'PROJECT_CREATE', action: 'CREATE', resourceType: 'PROJECT' },
      ]);

      jest.spyOn(service as any, 'getDelegatedPermissions').mockResolvedValue([]);
      jest.spyOn(service as any, 'auditPermissionCheck').mockResolvedValue(undefined);

      const result = await service.checkPermission(context);

      expect(result.granted).toBe(true);
      expect(result.reason).toContain('Permission granted');
    });

    it('should deny permission for unauthorized user', async () => {
      const mockUser = {
        id: 'user-1',
        roles: [{ name: 'GUEST', level: 1 }],
      };

      const context = {
        user: mockUser,
        action: 'DELETE',
        resource: { type: 'PROJECT', id: 'project-1' },
      };

      jest.spyOn(service as any, 'getUserRolesInContext').mockResolvedValue([
        { role: { name: 'GUEST', level: 1 } },
      ]);

      jest.spyOn(service as any, 'getRolePermissions').mockResolvedValue([]);
      jest.spyOn(service as any, 'getDelegatedPermissions').mockResolvedValue([]);
      jest.spyOn(service as any, 'auditPermissionCheck').mockResolvedValue(undefined);

      const result = await service.checkPermission(context);

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('No matching permissions');
    });

    it('should handle conditional permissions', async () => {
      const mockUser = {
        id: 'user-1',
        roles: [{ name: 'DEVELOPER', level: 2 }],
      };

      const context = {
        user: mockUser,
        action: 'UPDATE',
        resource: {
          type: 'TASK',
          id: 'task-1',
          data: { assignedUserId: 'user-1' }
        },
      };

      jest.spyOn(service as any, 'getUserRolesInContext').mockResolvedValue([
        { role: { name: 'DEVELOPER', level: 2 } },
      ]);

      jest.spyOn(service as any, 'getRolePermissions').mockResolvedValue([
        {
          name: 'TASK_UPDATE_OWN',
          action: 'UPDATE',
          resourceType: 'TASK',
          conditionExpression: 'user.id === resource.data.assignedUserId'
        },
      ]);

      jest.spyOn(service as any, 'getDelegatedPermissions').mockResolvedValue([]);
      jest.spyOn(service as any, 'evaluateCondition').mockResolvedValue(true);
      jest.spyOn(service as any, 'auditPermissionCheck').mockResolvedValue(undefined);

      const result = await service.checkPermission(context);

      expect(result.granted).toBe(true);
      expect(result.conditions).toContain('user.id === resource.data.assignedUserId');
    });
  });
});
```

### 2. Permission Guard Tests

```typescript
// src/auth/guards/__tests__/permission.guard.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import { PermissionService } from '../services/permission.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let permissionService: PermissionService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: PermissionService,
          useValue: {
            checkPermission: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    permissionService = module.get<PermissionService>(PermissionService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when permission is granted', async () => {
    const mockContext = createMockExecutionContext({
      user: { id: 'user-1', roles: ['ADMIN'] },
      params: { projectId: 'project-1' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'READ', resource: 'PROJECT' },
    ]);

    jest.spyOn(permissionService, 'checkPermission').mockResolvedValue({
      granted: true,
      reason: 'Admin access',
    });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(permissionService.checkPermission).toHaveBeenCalledWith({
      user: { id: 'user-1', roles: ['ADMIN'] },
      resource: { type: 'PROJECT', id: 'project-1', data: { projectId: 'project-1' } },
      action: 'READ',
      additionalContext: expect.any(Object),
    });
  });

  it('should deny access when permission is not granted', async () => {
    const mockContext = createMockExecutionContext({
      user: { id: 'user-1', roles: ['GUEST'] },
      params: { projectId: 'project-1' },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      { action: 'DELETE', resource: 'PROJECT' },
    ]);

    jest.spyOn(permissionService, 'checkPermission').mockResolvedValue({
      granted: false,
      reason: 'Insufficient permissions',
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  function createMockExecutionContext(requestData: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ...requestData,
          ip: '127.0.0.1',
          get: (header: string) => header === 'User-Agent' ? 'test-agent' : undefined,
          method: 'GET',
          url: '/test',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }
});
```

### 3. React Component Tests

```typescript
// src/components/auth/__tests__/PermissionGate.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '../PermissionGate';
import { PermissionProvider } from '../../contexts/PermissionContext';

const mockPermissionContext = {
  user: { id: 'user-1', name: 'Test User' },
  permissions: new Set(['READ', 'PROJECT.CREATE']),
  checkPermission: jest.fn(),
  hasRole: jest.fn(),
  canAccess: jest.fn(),
  isLoading: false,
  refreshPermissions: jest.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PermissionProvider user={mockPermissionContext.user}>
    {children}
  </PermissionProvider>
);

describe('PermissionGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when permission is granted', () => {
    mockPermissionContext.checkPermission.mockReturnValue(true);

    render(
      <TestWrapper>
        <PermissionGate permission="READ">
          <div>Protected Content</div>
        </PermissionGate>
      </TestWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render fallback when permission is denied', () => {
    mockPermissionContext.checkPermission.mockReturnValue(false);

    render(
      <TestWrapper>
        <PermissionGate permission="DELETE" fallback={<div>Access Denied</div>}>
          <div>Protected Content</div>
        </PermissionGate>
      </TestWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should check role-based access', () => {
    mockPermissionContext.hasRole.mockReturnValue(true);

    render(
      <TestWrapper>
        <PermissionGate role="ADMIN">
          <div>Admin Content</div>
        </PermissionGate>
      </TestWrapper>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(mockPermissionContext.hasRole).toHaveBeenCalledWith('ADMIN', undefined);
  });

  it('should check multiple permissions with requireAll', () => {
    mockPermissionContext.checkPermission
      .mockReturnValueOnce(true)  // First permission
      .mockReturnValueOnce(false); // Second permission

    render(
      <TestWrapper>
        <PermissionGate
          permissions={['READ', 'WRITE']}
          requireAll={true}
          fallback={<div>Insufficient Permissions</div>}
        >
          <div>All Permissions Required</div>
        </PermissionGate>
      </TestWrapper>
    );

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### 1. Permission Caching

```typescript
// src/auth/services/cache.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class PermissionCacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getUserPermissions(userId: string): Promise<Set<string> | null> {
    const cacheKey = `permissions:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return new Set(JSON.parse(cached));
    }

    return null;
  }

  async setUserPermissions(userId: string, permissions: Set<string>, ttl: number = 300): Promise<void> {
    const cacheKey = `permissions:${userId}`;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(Array.from(permissions)));
  }

  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = `permissions:${userId}`;
    await this.redis.del(cacheKey);
  }

  async invalidateRolePermissions(roleName: string): Promise<void> {
    // Invalidate all users with this role
    const pattern = `permissions:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async batchInvalidatePermissions(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const keys = userIds.map(id => `permissions:${id}`);
    await this.redis.del(...keys);
  }
}
```

### 2. Database Query Optimization

```typescript
// src/auth/services/optimized-permission.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionCacheService } from './cache.service';

@Injectable()
export class OptimizedPermissionService extends PermissionService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private cacheService: PermissionCacheService,
  ) {
    super();
  }

  async checkPermissionOptimized(context: PermissionContext): Promise<PermissionResult> {
    // 1. Try cache first
    const cachedPermissions = await this.cacheService.getUserPermissions(context.user.id);

    if (cachedPermissions) {
      return this.checkPermissionFromCache(context, cachedPermissions);
    }

    // 2. Load from database with optimized query
    const result = await super.checkPermission(context);

    // 3. Cache the result
    if (result.granted) {
      await this.cacheUserPermissions(context.user.id);
    }

    return result;
  }

  private async checkPermissionFromCache(
    context: PermissionContext,
    permissions: Set<string>
  ): Promise<PermissionResult> {
    const permissionKey = context.resource
      ? `${context.resource.type}.${context.action}`
      : context.action;

    if (permissions.has(permissionKey) || permissions.has('*')) {
      return {
        granted: true,
        reason: 'Permission granted from cache',
      };
    }

    return {
      granted: false,
      reason: 'Permission not found in cache',
    };
  }

  private async cacheUserPermissions(userId: string): Promise<void> {
    // Load all user permissions and cache them
    const userRoles = await this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > :now)', { now: new Date() })
      .getMany();

    const permissions = new Set<string>();

    userRoles.forEach(userRole => {
      userRole.role.permissions.forEach(rolePermission => {
        if (rolePermission.granted) {
          const permission = rolePermission.permission;
          permissions.add(`${permission.resourceType}.${permission.action}`);
        }
      });
    });

    await this.cacheService.setUserPermissions(userId, permissions);
  }
}
```

This comprehensive RBAC implementation provides a secure, scalable, and maintainable authorization system for the Scrum board application. The design supports fine-grained permissions, role inheritance, conditional access, and field-level security while maintaining good performance through caching strategies.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive RBAC model documentation", "status": "completed", "activeForm": "Creating comprehensive RBAC model documentation"}, {"content": "Design role hierarchy with inheritance patterns", "status": "completed", "activeForm": "Designing role hierarchy with inheritance patterns"}, {"content": "Create detailed permission model with resource and action-based permissions", "status": "completed", "activeForm": "Creating detailed permission model with resource and action-based permissions"}, {"content": "Build comprehensive authorization matrix for all roles", "status": "completed", "activeForm": "Building comprehensive authorization matrix for all roles"}, {"content": "Design database schema for roles and permissions", "status": "completed", "activeForm": "Designing database schema for roles and permissions"}, {"content": "Create implementation design with guards and middleware", "status": "completed", "activeForm": "Creating implementation design with guards and middleware"}, {"content": "Design advanced features like delegation and approval workflows", "status": "completed", "activeForm": "Designing advanced features like delegation and approval workflows"}, {"content": "Create NestJS implementation examples with guards and decorators", "status": "completed", "activeForm": "Creating NestJS implementation examples with guards and decorators"}, {"content": "Create React permission components and hooks", "status": "completed", "activeForm": "Creating React permission components and hooks"}, {"content": "Document permission caching strategy and performance considerations", "status": "completed", "activeForm": "Documenting permission caching strategy and performance considerations"}]
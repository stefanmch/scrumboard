# Authentication Integration Guide for Scrum Board Features

## Overview

This guide details how the authentication system integrates with existing Scrum board features and provides specific implementation patterns for role-based access control within the application.

## Role-Based Access Control (RBAC) Matrix

### User Roles and Permissions

Based on the existing Prisma schema, the system supports the following roles with specific permissions:

| Feature | ADMIN | SCRUM_MASTER | PRODUCT_OWNER | DEVELOPER | STAKEHOLDER | MEMBER |
|---------|-------|--------------|---------------|-----------|-------------|--------|
| **Team Management** |
| Create teams | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete teams | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add team members | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove team members | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View team details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Management** |
| Create projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify project settings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View project details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sprint Management** |
| Create sprints | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Start/end sprints | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modify sprint settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View sprint details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Story Management** |
| Create stories | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete stories | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify story details | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign stories | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Move stories between statuses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View stories | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Task Management** |
| Create tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Modify task details | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update task status | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Retrospectives** |
| Create retrospectives | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Facilitate retrospectives | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add retrospective items | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vote on items | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create action items | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Reporting** |
| View all reports | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

## Integration Patterns

### 1. Page-Level Protection

```typescript
// pages/projects/[projectId]/index.tsx
import { GetServerSideProps } from 'next';
import { getServerSideAuth } from '@/lib/auth/serverAuth';
import { checkProjectAccess } from '@/lib/auth/permissions';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await getServerSideAuth(context);

  if (!auth.authenticated) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  const { projectId } = context.params!;
  const hasAccess = await checkProjectAccess(auth.user.id, projectId as string);

  if (!hasAccess) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user: auth.user,
      projectId,
    },
  };
};
```

### 2. Component-Level Protection

```typescript
// components/auth/ProtectedComponent.tsx
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedComponentProps {
  children: ReactNode;
  requiredRole?: string[];
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function ProtectedComponent({
  children,
  requiredRole,
  requiredPermission,
  fallback = null,
}: ProtectedComponentProps) {
  const { user, checkPermission } = useAuth();

  if (!user) {
    return fallback;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return fallback;
  }

  if (requiredPermission && !checkPermission(requiredPermission)) {
    return fallback;
  }

  return <>{children}</>;
}

// Usage example
<ProtectedComponent
  requiredRole={['SCRUM_MASTER', 'PRODUCT_OWNER']}
  fallback={<div>Access denied</div>}
>
  <CreateSprintButton />
</ProtectedComponent>
```

### 3. API Route Protection with Context

```typescript
// pages/api/projects/[projectId]/stories.ts
import { withAuth } from '@/lib/auth/withAuth';
import { checkProjectMembership } from '@/lib/auth/permissions';

export default withAuth(
  async (req, res) => {
    const { projectId } = req.query;
    const { user } = req;

    // Check if user is a member of the project
    const isMember = await checkProjectMembership(user.id, projectId as string);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a project member' });
    }

    switch (req.method) {
      case 'GET':
        // Anyone can view stories if they're a project member
        const stories = await getProjectStories(projectId as string);
        return res.json(stories);

      case 'POST':
        // Only certain roles can create stories
        if (!['ADMIN', 'SCRUM_MASTER', 'PRODUCT_OWNER', 'DEVELOPER'].includes(user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const newStory = await createStory({
          ...req.body,
          projectId: projectId as string,
          creatorId: user.id,
        });
        return res.json(newStory);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  },
  { requireEmailVerified: true }
);
```

### 4. Real-time WebSocket Integration

```typescript
// lib/websocket/scrumBoard.ts
import { Server, Socket } from 'socket.io';
import { verifyJWT } from '@/lib/auth/jwt';
import { checkProjectMembership } from '@/lib/auth/permissions';

export function setupScrumBoardEvents(io: Server) {
  const scrumBoard = io.of('/scrumboard');

  scrumBoard.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const payload = await verifyJWT(token);

      socket.userId = payload.userId;
      socket.userRole = payload.role;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  scrumBoard.on('connection', (socket: Socket) => {
    // Join project-specific rooms based on user permissions
    socket.on('join-project', async (projectId: string) => {
      const isMember = await checkProjectMembership(socket.userId, projectId);

      if (isMember) {
        socket.join(`project:${projectId}`);
        socket.emit('joined-project', { projectId });
      } else {
        socket.emit('error', { message: 'Not authorized for this project' });
      }
    });

    // Story updates with permission checks
    socket.on('update-story', async (data) => {
      const { storyId, updates } = data;

      // Check if user can modify stories
      if (!['ADMIN', 'SCRUM_MASTER', 'PRODUCT_OWNER', 'DEVELOPER'].includes(socket.userRole)) {
        return socket.emit('error', { message: 'Cannot modify stories' });
      }

      // Get story project and verify membership
      const story = await getStoryById(storyId);
      const isMember = await checkProjectMembership(socket.userId, story.projectId);

      if (!isMember) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      // Update story and broadcast to project members
      const updatedStory = await updateStory(storyId, updates);
      scrumBoard.to(`project:${story.projectId}`).emit('story-updated', updatedStory);
    });
  });
}
```

## Team-Based Access Control

### 1. Team Membership Verification

```typescript
// lib/auth/permissions.ts
import { prisma } from '@/lib/prisma';

export async function checkTeamMembership(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });

  return !!membership;
}

export async function checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  return project?.team.members.length > 0;
}

export async function getUserProjectRole(userId: string, projectId: string): Promise<string | null> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        projects: {
          some: {
            id: projectId,
          },
        },
      },
    },
    select: {
      role: true,
    },
  });

  return membership?.role || null;
}
```

### 2. Context-Aware Permissions

```typescript
// contexts/ProjectContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projectId: string | null;
  userRole: string | null;
  permissions: string[];
  canCreateStories: boolean;
  canManageSprints: boolean;
  canDeleteItems: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
  projectId
}: {
  children: React.ReactNode;
  projectId: string;
}) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user && projectId) {
      fetchUserProjectRole();
    }
  }, [user, projectId]);

  const fetchUserProjectRole = async () => {
    const response = await fetch(`/api/projects/${projectId}/user-role`);
    const data = await response.json();
    setUserRole(data.role);
    setPermissions(data.permissions);
  };

  const canCreateStories = permissions.includes('create:stories');
  const canManageSprints = permissions.includes('manage:sprints');
  const canDeleteItems = permissions.includes('delete:items');

  return (
    <ProjectContext.Provider value={{
      projectId,
      userRole,
      permissions,
      canCreateStories,
      canManageSprints,
      canDeleteItems,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};
```

## Security Considerations for Scrum Board Features

### 1. Data Isolation

```typescript
// lib/db/queries.ts
// Ensure all queries respect team/project boundaries

export async function getUserStories(userId: string, filters?: StoryFilters) {
  return prisma.story.findMany({
    where: {
      AND: [
        // Only stories from projects where user is a team member
        {
          project: {
            team: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        },
        // Apply additional filters
        filters ? convertFiltersToWhere(filters) : {},
      ],
    },
    include: {
      project: true,
      assignee: true,
      creator: true,
    },
  });
}

export async function getUserTeams(userId: string) {
  return prisma.team.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });
}
```

### 2. Audit Logging for Scrum Operations

```typescript
// lib/audit/logger.ts
interface AuditEvent {
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  projectId?: string;
  teamId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}

export async function logAuditEvent(event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      ...event,
      timestamp: new Date(),
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
    },
  });
}

// Usage in story operations
export async function updateStory(storyId: string, updates: any, userId: string) {
  const oldStory = await prisma.story.findUnique({ where: { id: storyId } });

  const updatedStory = await prisma.story.update({
    where: { id: storyId },
    data: updates,
  });

  await logAuditEvent({
    action: 'UPDATE',
    resource: 'story',
    resourceId: storyId,
    userId,
    projectId: updatedStory.projectId,
    oldValues: oldStory,
    newValues: updatedStory,
  });

  return updatedStory;
}
```

### 3. Rate Limiting for Scrum Operations

```typescript
// middleware/rateLimiting.ts
const scrumOperationLimits = {
  'create:story': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 stories per minute
  'update:story': { windowMs: 60 * 1000, maxRequests: 50 }, // 50 updates per minute
  'create:task': { windowMs: 60 * 1000, maxRequests: 20 },  // 20 tasks per minute
  'create:comment': { windowMs: 60 * 1000, maxRequests: 30 }, // 30 comments per minute
};

export function rateLimitScrumOperation(operation: string) {
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: NextFunction) => {
    const identifier = `${req.user.id}:${operation}`;
    const limit = scrumOperationLimits[operation];

    if (limit) {
      const rateLimiter = new RateLimiter(redis);
      const result = await rateLimiter.checkLimit(identifier, limit);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: result.resetTime,
        });
      }
    }

    next();
  };
}
```

## Feature-Specific Authentication Patterns

### 1. Sprint Planning Authentication

```typescript
// pages/projects/[projectId]/planning.tsx
export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await getServerSideAuth(context);

  if (!auth.authenticated) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { projectId } = context.params!;
  const userRole = await getUserProjectRole(auth.user.id, projectId as string);

  // Only SCRUM_MASTER and PRODUCT_OWNER can access sprint planning
  if (!['ADMIN', 'SCRUM_MASTER', 'PRODUCT_OWNER'].includes(userRole || '')) {
    return { notFound: true };
  }

  return {
    props: {
      user: auth.user,
      projectId,
      userRole,
    },
  };
};
```

### 2. Retrospective Access Control

```typescript
// components/retrospectives/RetrospectiveBoard.tsx
export function RetrospectiveBoard({ retrospectiveId }: { retrospectiveId: string }) {
  const { user } = useAuth();
  const { userRole, permissions } = useProject();

  const canFacilitate = permissions.includes('facilitate:retrospectives');
  const canCreateActionItems = permissions.includes('create:action-items');

  return (
    <div className="retrospective-board">
      {canFacilitate && (
        <FacilitatorControls retrospectiveId={retrospectiveId} />
      )}

      <RetrospectiveItems retrospectiveId={retrospectiveId} />

      {canCreateActionItems && (
        <ActionItemCreator retrospectiveId={retrospectiveId} />
      )}
    </div>
  );
}
```

### 3. Report Access Control

```typescript
// pages/api/projects/[projectId]/reports/[reportType].ts
export default withAuth(
  async (req, res) => {
    const { projectId, reportType } = req.query;
    const { user } = req;

    // Check project access
    const hasAccess = await checkProjectAccess(user.id, projectId as string);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Project access denied' });
    }

    // Check report-specific permissions
    const canViewReports = ['ADMIN', 'SCRUM_MASTER', 'PRODUCT_OWNER', 'STAKEHOLDER'].includes(user.role);
    if (!canViewReports) {
      return res.status(403).json({ error: 'Insufficient permissions for reports' });
    }

    const report = await generateReport(projectId as string, reportType as string);
    return res.json(report);
  }
);
```

This integration guide provides comprehensive patterns for implementing authentication across all Scrum board features while maintaining proper security boundaries and user experience.
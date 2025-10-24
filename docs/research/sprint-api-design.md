# Sprint API Design Specification

## Overview
Comprehensive API design for Sprint Management (Epic 3) following established patterns from the scrumboard codebase.

---

## 1. Base Route Structure

### Nested Resource Pattern
Following the projects pattern, sprints should be nested under projects:

```
/teams/:teamId/projects/:projectId/sprints
```

**Rationale:**
- Sprints belong to projects
- Project belongs to teams
- Maintains hierarchical resource relationship
- Consistent with existing projects API: `/teams/:teamId/projects`

---

## 2. Sprint CRUD Endpoints

### 2.1 Create Sprint
**Endpoint:** `POST /teams/:teamId/projects/:projectId/sprints`

**Authorization:** Team Member

**Request Body:**
```typescript
{
  name: string              // Required: "Sprint 1", "Q1 Sprint 3"
  goal?: string            // Optional: "Implement user dashboard"
  startDate: string        // Required: ISO 8601 date
  endDate: string          // Required: ISO 8601 date
  capacity?: number        // Optional: Story points capacity (e.g., 40)
}
```

**Response:** `201 Created`
```typescript
{
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  capacity: number | null
  velocity: number | null
  createdAt: string
  updatedAt: string
  projectId: string
  projectName: string
  teamName: string
  storyCount: number
  completedStoryCount: number
  totalStoryPoints: number
  completedStoryPoints: number
}
```

**Validation Rules:**
- `name`: Required, min 1 char, max 100 chars
- `startDate`: Required, must be valid date
- `endDate`: Required, must be after startDate
- `capacity`: Optional, min 1, max 1000
- Verify user is team member before creation

**Error Responses:**
- `400 Bad Request`: Validation errors (endDate before startDate)
- `403 Forbidden`: User not a team member
- `404 Not Found`: Project not found

---

### 2.2 List Sprints
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints`

**Authorization:** Team Member

**Query Parameters:**
```typescript
{
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"  // Filter by status
  limit?: number                                              // Pagination limit (default: 20)
  offset?: number                                             // Pagination offset (default: 0)
  sortBy?: "startDate" | "endDate" | "createdAt"            // Sort field (default: startDate)
  sortOrder?: "asc" | "desc"                                 // Sort direction (default: desc)
}
```

**Response:** `200 OK`
```typescript
{
  sprints: [
    {
      id: string
      name: string
      goal: string | null
      startDate: string
      endDate: string
      status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
      capacity: number | null
      velocity: number | null
      storyCount: number
      completedStoryCount: number
      totalStoryPoints: number
      completedStoryPoints: number
      createdAt: string
      updatedAt: string
    }
  ],
  total: number
  limit: number
  offset: number
}
```

**Default Ordering:** Most recent first (startDate DESC)

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Project not found

---

### 2.3 Get Sprint by ID
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints/:id`

**Authorization:** Team Member

**Response:** `200 OK`
```typescript
{
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  capacity: number | null
  velocity: number | null
  createdAt: string
  updatedAt: string
  projectId: string
  projectName: string
  teamName: string

  // Related entities
  stories: [
    {
      id: string
      title: string
      status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED"
      storyPoints: number | null
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      assignee: {
        id: string
        name: string
        avatar: string | null
      } | null
    }
  ],
  comments: [
    {
      id: string
      content: string
      type: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"
      createdAt: string
      author: {
        id: string
        name: string
        avatar: string | null
      }
    }
  ],

  // Calculated metrics
  metrics: {
    totalStoryPoints: number
    completedStoryPoints: number
    completionPercentage: number
    remainingStoryPoints: number
    velocity: number | null
    daysRemaining: number
    daysElapsed: number
    totalDays: number
  }
}
```

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

### 2.4 Update Sprint
**Endpoint:** `PATCH /teams/:teamId/projects/:projectId/sprints/:id`

**Authorization:** Team Member (Read-only fields), Team Admin (Status changes)

**Request Body:** (All fields optional)
```typescript
{
  name?: string
  goal?: string
  startDate?: string
  endDate?: string
  capacity?: number
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
}
```

**Response:** `200 OK` (Same structure as Get Sprint)

**Business Rules:**
- **Status Transitions:**
  - PLANNING → ACTIVE (requires at least 1 story)
  - ACTIVE → COMPLETED (automatically calculates velocity)
  - Any status → CANCELLED
  - Cannot revert from COMPLETED or CANCELLED
- **Date Changes:** Can only modify dates if status is PLANNING
- **Velocity:** Automatically calculated when status changes to COMPLETED

**Authorization Rules:**
- Team Member: Can update name, goal, capacity (if status is PLANNING)
- Team Admin: Can update status

**Error Responses:**
- `400 Bad Request`: Invalid status transition
- `403 Forbidden`: User not authorized for this update
- `404 Not Found`: Sprint or project not found

---

### 2.5 Delete Sprint
**Endpoint:** `DELETE /teams/:teamId/projects/:projectId/sprints/:id`

**Authorization:** Team Admin

**Response:** `204 No Content`

**Business Rules:**
- Cannot delete ACTIVE sprints (must cancel first)
- Deleting sprint unassigns all stories (sprintId set to null)
- Cascade deletes comments and retrospectives

**Error Responses:**
- `400 Bad Request`: Cannot delete ACTIVE sprint
- `403 Forbidden`: User not a team admin
- `404 Not Found`: Sprint or project not found

---

## 3. Sprint Story Assignment Endpoints

### 3.1 Assign Story to Sprint
**Endpoint:** `PUT /teams/:teamId/projects/:projectId/sprints/:sprintId/stories/:storyId`

**Authorization:** Team Member

**Response:** `200 OK`
```typescript
{
  story: {
    id: string
    title: string
    sprintId: string
    sprintName: string
    // ... other story fields
  }
}
```

**Business Rules:**
- Story must belong to same project as sprint
- Cannot assign to COMPLETED or CANCELLED sprints
- Automatically unassigns from previous sprint if assigned

**Error Responses:**
- `400 Bad Request`: Story already assigned, sprint closed
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint, story, or project not found

---

### 3.2 Unassign Story from Sprint
**Endpoint:** `DELETE /teams/:teamId/projects/:projectId/sprints/:sprintId/stories/:storyId`

**Authorization:** Team Member

**Response:** `200 OK`
```typescript
{
  story: {
    id: string
    title: string
    sprintId: null
    // ... other story fields
  }
}
```

**Business Rules:**
- Can only unassign from PLANNING or ACTIVE sprints
- Story moves back to backlog

**Error Responses:**
- `400 Bad Request`: Sprint is COMPLETED or CANCELLED
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint, story, or project not found

---

### 3.3 Bulk Assign Stories
**Endpoint:** `POST /teams/:teamId/projects/:projectId/sprints/:sprintId/stories/bulk`

**Authorization:** Team Member

**Request Body:**
```typescript
{
  storyIds: string[]  // Array of story IDs to assign
}
```

**Response:** `200 OK`
```typescript
{
  assignedStories: number
  stories: [
    {
      id: string
      title: string
      sprintId: string
      // ... other story fields
    }
  ]
}
```

**Business Rules:**
- All stories must belong to same project
- Skips invalid story IDs (not found or wrong project)
- Returns list of successfully assigned stories

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

## 4. Sprint Metrics Endpoints

### 4.1 Get Sprint Metrics
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints/:id/metrics`

**Authorization:** Team Member

**Response:** `200 OK`
```typescript
{
  sprintId: string
  sprintName: string
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"

  // Story metrics
  totalStories: number
  completedStories: number
  inProgressStories: number
  todoStories: number
  blockedStories: number

  // Story point metrics
  totalStoryPoints: number
  completedStoryPoints: number
  inProgressStoryPoints: number
  remainingStoryPoints: number

  // Progress metrics
  completionPercentage: number  // Based on story points
  velocity: number | null       // Only for COMPLETED sprints

  // Time metrics
  startDate: string
  endDate: string
  daysTotal: number
  daysElapsed: number
  daysRemaining: number
  progressPercentage: number    // Time-based progress

  // Burndown data (for chart)
  burndown: [
    {
      date: string
      remainingStoryPoints: number
      idealRemainingPoints: number
      completedStoryPoints: number
    }
  ]
}
```

**Metrics Calculation:**
- **Velocity**: Total completed story points (only calculated on COMPLETED)
- **Completion %**: (completedStoryPoints / totalStoryPoints) * 100
- **Progress %**: (daysElapsed / daysTotal) * 100
- **Burndown**: Daily snapshot of remaining story points vs ideal line

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

### 4.2 Get Sprint Burndown Chart Data
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints/:id/burndown`

**Authorization:** Team Member

**Query Parameters:**
```typescript
{
  granularity?: "daily" | "hourly"  // Default: daily
}
```

**Response:** `200 OK`
```typescript
{
  sprintId: string
  sprintName: string
  startDate: string
  endDate: string
  capacity: number | null

  data: [
    {
      date: string                    // ISO date or datetime
      remainingStoryPoints: number
      completedStoryPoints: number
      idealRemainingPoints: number    // Linear burndown line
      velocityTrend: number          // Moving average
    }
  ]
}
```

**Calculation:**
- **Ideal Line**: Linear decrease from capacity to 0
- **Actual Line**: Real-time remaining story points
- **Velocity Trend**: 3-day moving average of completion rate

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

### 4.3 Get Active Sprint
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints/active`

**Authorization:** Team Member

**Response:** `200 OK`
```typescript
{
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: "ACTIVE"
  capacity: number | null
  // ... full sprint data with stories, metrics, etc.
} | null  // null if no active sprint
```

**Business Rules:**
- Returns null if no active sprint (status = ACTIVE)
- Only one sprint should be active at a time per project

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Project not found

---

## 5. Sprint Comment Endpoints

### 5.1 Create Sprint Comment
**Endpoint:** `POST /teams/:teamId/projects/:projectId/sprints/:sprintId/comments`

**Authorization:** Team Member

**Request Body:**
```typescript
{
  content: string                                                    // Required
  type?: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"  // Default: GENERAL
}
```

**Response:** `201 Created`
```typescript
{
  id: string
  content: string
  type: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"
  createdAt: string
  updatedAt: string
  sprintId: string
  author: {
    id: string
    name: string
    avatar: string | null
    email: string
  }
}
```

**Validation:**
- `content`: Required, min 1 char, max 5000 chars

**Error Responses:**
- `400 Bad Request`: Validation errors
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

### 5.2 List Sprint Comments
**Endpoint:** `GET /teams/:teamId/projects/:projectId/sprints/:sprintId/comments`

**Authorization:** Team Member

**Query Parameters:**
```typescript
{
  type?: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"
  limit?: number
  offset?: number
}
```

**Response:** `200 OK`
```typescript
{
  comments: [
    {
      id: string
      content: string
      type: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"
      createdAt: string
      updatedAt: string
      author: {
        id: string
        name: string
        avatar: string | null
      }
    }
  ],
  total: number
}
```

**Default Ordering:** Most recent first (createdAt DESC)

**Error Responses:**
- `403 Forbidden`: User not a team member
- `404 Not Found`: Sprint or project not found

---

### 5.3 Update Sprint Comment
**Endpoint:** `PATCH /teams/:teamId/projects/:projectId/sprints/:sprintId/comments/:commentId`

**Authorization:** Comment Author or Team Admin

**Request Body:**
```typescript
{
  content?: string
  type?: "GENERAL" | "IMPEDIMENT" | "QUESTION" | "DECISION" | "ACTION_ITEM"
}
```

**Response:** `200 OK` (Same structure as Create)

**Authorization Rules:**
- Comment author can update their own comments
- Team admin can update any comment

**Error Responses:**
- `403 Forbidden`: User not authorized
- `404 Not Found`: Comment, sprint, or project not found

---

### 5.4 Delete Sprint Comment
**Endpoint:** `DELETE /teams/:teamId/projects/:projectId/sprints/:sprintId/comments/:commentId`

**Authorization:** Comment Author or Team Admin

**Response:** `204 No Content`

**Error Responses:**
- `403 Forbidden`: User not authorized
- `404 Not Found`: Comment, sprint, or project not found

---

## 6. Rate Limiting

Apply throttling to prevent abuse:

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 requests per minute
async create() { }

@Throttle({ default: { limit: 20, ttl: 60000 } })  // 20 requests per minute
async update() { }

@Throttle({ default: { limit: 5, ttl: 60000 } })   // 5 requests per minute
async delete() { }

// No throttle on GET requests
async findAll() { }
async findOne() { }
```

---

## 7. Error Response Format

Consistent error format across all endpoints:

```typescript
{
  statusCode: number
  message: string | string[]
  error: string
  timestamp: string
  path: string
}
```

**Example:**
```json
{
  "statusCode": 400,
  "message": ["endDate must be after startDate", "name should not be empty"],
  "error": "Bad Request",
  "timestamp": "2025-10-24T20:00:00.000Z",
  "path": "/teams/abc123/projects/def456/sprints"
}
```

---

## 8. Swagger/OpenAPI Documentation

All endpoints must include:
- `@ApiTags('sprints')`
- `@ApiOperation({ summary: 'Description' })`
- `@ApiResponse({ status: 200, type: ResponseDto })`
- `@ApiResponse({ status: 400, description: 'Error description' })`
- `@ApiBearerAuth()` for authenticated endpoints
- `@ApiParam()` for path parameters
- `@ApiQuery()` for query parameters

---

## 9. Summary

### Key Design Decisions

1. **Nested Routes**: Sprints under projects for clear resource hierarchy
2. **Authorization Layers**: Team membership required, admin for sensitive operations
3. **Comprehensive Metrics**: Built-in sprint metrics and burndown calculations
4. **Flexible Comments**: Type-categorized comments for filtering
5. **Bulk Operations**: Efficient bulk story assignment
6. **Active Sprint**: Dedicated endpoint for current active sprint
7. **Rate Limiting**: Protect against abuse
8. **Consistent Errors**: Standard error format across all endpoints

### API Endpoint Summary

**CRUD Operations:**
- POST /sprints - Create sprint
- GET /sprints - List sprints
- GET /sprints/:id - Get sprint details
- PATCH /sprints/:id - Update sprint
- DELETE /sprints/:id - Delete sprint

**Story Assignment:**
- PUT /sprints/:id/stories/:storyId - Assign story
- DELETE /sprints/:id/stories/:storyId - Unassign story
- POST /sprints/:id/stories/bulk - Bulk assign

**Metrics & Reporting:**
- GET /sprints/:id/metrics - Get sprint metrics
- GET /sprints/:id/burndown - Get burndown data
- GET /sprints/active - Get active sprint

**Comments:**
- POST /sprints/:id/comments - Create comment
- GET /sprints/:id/comments - List comments
- PATCH /sprints/:id/comments/:commentId - Update comment
- DELETE /sprints/:id/comments/:commentId - Delete comment

Total: **14 endpoints** covering full sprint lifecycle management.

# Sprint Management API Documentation

## Overview

The Sprint Management API provides comprehensive endpoints for managing agile sprints, including creation, lifecycle management, story assignment, metrics tracking, and collaboration features.

**Base URL**: `/api/sprints`

**Authentication**: All endpoints require JWT authentication via Bearer token.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Sprint Lifecycle](#sprint-lifecycle)
3. [Endpoints](#endpoints)
   - [Create Sprint](#create-sprint)
   - [List Sprints](#list-sprints)
   - [Get Sprint](#get-sprint)
   - [Update Sprint](#update-sprint)
   - [Delete Sprint](#delete-sprint)
   - [Start Sprint](#start-sprint)
   - [Complete Sprint](#complete-sprint)
   - [Add Stories](#add-stories)
   - [Remove Story](#remove-story)
   - [Get Metrics](#get-metrics)
   - [Add Comment](#add-comment)
   - [Get Comments](#get-comments)
4. [Data Models](#data-models)
5. [Error Responses](#error-responses)
6. [Rate Limiting](#rate-limiting)

---

## Authentication

All API requests require authentication using JWT tokens.

**Header Format**:
```
Authorization: Bearer <your-jwt-token>
```

**Authentication Error Response**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Sprint Lifecycle

Sprints follow a defined lifecycle with three status states:

1. **PLANNING** - Initial state when sprint is created
2. **ACTIVE** - Sprint is currently running (only one per project)
3. **COMPLETED** - Sprint has finished

**Valid Transitions**:
- `PLANNING` → `ACTIVE` (via Start Sprint endpoint)
- `ACTIVE` → `COMPLETED` (via Complete Sprint endpoint)

**Business Rules**:
- Only sprints in PLANNING status can be started
- Only one ACTIVE sprint allowed per project at a time
- Sprint dates cannot overlap with other active/planning sprints
- End date must be after start date
- Completed sprints cannot be restarted

---

## Endpoints

### Create Sprint

Creates a new sprint in PLANNING status.

**Endpoint**: `POST /sprints`

**Request Body**:
```json
{
  "name": "Sprint 1",
  "goal": "Implement user authentication and profile management",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "capacity": 40,
  "projectId": "project-uuid-here"
}
```

**Request Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | Not empty | Sprint name |
| goal | string | No | - | Sprint goal/objective |
| startDate | string | Yes | ISO 8601 date | Sprint start date |
| endDate | string | Yes | ISO 8601 date | Sprint end date (must be after startDate) |
| capacity | number | No | Integer >= 0 | Team capacity in story points |
| projectId | string | Yes | Not empty | UUID of parent project |

**Success Response**: `201 Created`
```json
{
  "id": "sprint-uuid",
  "name": "Sprint 1",
  "goal": "Implement user authentication and profile management",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "capacity": 40,
  "velocity": null,
  "status": "PLANNING",
  "projectId": "project-uuid",
  "createdAt": "2025-10-24T12:00:00.000Z",
  "updatedAt": "2025-10-24T12:00:00.000Z",
  "project": {
    "id": "project-uuid",
    "name": "Project Name",
    "key": "PROJ"
  },
  "stories": [],
  "comments": []
}
```

**Error Responses**:

- **400 Bad Request** - Invalid date range
```json
{
  "statusCode": 400,
  "message": "End date must be after start date"
}
```

- **409 Conflict** - Overlapping sprint dates
```json
{
  "statusCode": 409,
  "message": "Sprint dates overlap with existing active or planning sprint"
}
```

---

### List Sprints

Retrieves all sprints with optional filtering.

**Endpoint**: `GET /sprints`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | No | Filter by project UUID |
| status | enum | No | Filter by status: PLANNING, ACTIVE, COMPLETED |

**Examples**:
```
GET /sprints
GET /sprints?projectId=project-uuid
GET /sprints?status=ACTIVE
GET /sprints?projectId=project-uuid&status=PLANNING
```

**Success Response**: `200 OK`
```json
[
  {
    "id": "sprint-uuid-1",
    "name": "Sprint 1",
    "goal": "User authentication",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-01-14T23:59:59.999Z",
    "capacity": 40,
    "velocity": 35,
    "status": "COMPLETED",
    "projectId": "project-uuid",
    "createdAt": "2025-10-24T12:00:00.000Z",
    "updatedAt": "2025-10-24T12:00:00.000Z",
    "project": { "id": "project-uuid", "name": "Project Name", "key": "PROJ" },
    "stories": [
      {
        "id": "story-uuid",
        "title": "User login",
        "storyPoints": 5,
        "status": "DONE"
      }
    ],
    "comments": [],
    "retrospectives": []
  },
  {
    "id": "sprint-uuid-2",
    "name": "Sprint 2",
    "status": "ACTIVE",
    "stories": []
  }
]
```

**Sorting**: Results are ordered by status (ascending) then start date (descending).

---

### Get Sprint

Retrieves detailed information about a specific sprint.

**Endpoint**: `GET /sprints/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Example**: `GET /sprints/sprint-uuid-123`

**Success Response**: `200 OK`
```json
{
  "id": "sprint-uuid-123",
  "name": "Sprint 1",
  "goal": "Implement user authentication and profile management",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "capacity": 40,
  "velocity": null,
  "status": "ACTIVE",
  "projectId": "project-uuid",
  "createdAt": "2025-10-24T12:00:00.000Z",
  "updatedAt": "2025-10-24T12:00:00.000Z",
  "project": {
    "id": "project-uuid",
    "name": "Authentication System",
    "key": "AUTH",
    "description": "User authentication project"
  },
  "stories": [
    {
      "id": "story-uuid-1",
      "title": "User registration",
      "description": "As a user, I want to register...",
      "storyPoints": 8,
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "rank": 1,
      "assignee": {
        "id": "user-uuid",
        "email": "dev@example.com",
        "fullName": "John Developer"
      },
      "creator": {
        "id": "user-uuid-2",
        "email": "pm@example.com",
        "fullName": "Jane PM"
      },
      "tasks": [
        {
          "id": "task-uuid",
          "title": "Create registration form",
          "completed": true
        }
      ],
      "comments": []
    }
  ],
  "comments": [
    {
      "id": "comment-uuid",
      "content": "Sprint looking good, team!",
      "type": "GENERAL",
      "createdAt": "2025-01-02T10:00:00.000Z",
      "author": {
        "id": "user-uuid",
        "email": "pm@example.com",
        "fullName": "Jane PM"
      }
    }
  ],
  "retrospectives": []
}
```

**Error Response**: `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Update Sprint

Updates sprint properties. Can update name, goal, dates, capacity, or status.

**Endpoint**: `PATCH /sprints/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body** (all fields optional):
```json
{
  "name": "Sprint 1 - Updated",
  "goal": "Updated sprint goal",
  "startDate": "2025-01-02T00:00:00.000Z",
  "endDate": "2025-01-16T23:59:59.999Z",
  "capacity": 45,
  "status": "ACTIVE"
}
```

**Request Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | No | Not empty | Sprint name |
| goal | string | No | - | Sprint goal |
| startDate | string | No | ISO 8601 date | Sprint start date |
| endDate | string | No | ISO 8601 date | Sprint end date |
| capacity | number | No | Integer >= 0 | Team capacity |
| status | enum | No | PLANNING, ACTIVE, COMPLETED | Sprint status |

**Success Response**: `200 OK`
```json
{
  "id": "sprint-uuid",
  "name": "Sprint 1 - Updated",
  "goal": "Updated sprint goal",
  "startDate": "2025-01-02T00:00:00.000Z",
  "endDate": "2025-01-16T23:59:59.999Z",
  "capacity": 45,
  "velocity": null,
  "status": "ACTIVE",
  "projectId": "project-uuid",
  "createdAt": "2025-10-24T12:00:00.000Z",
  "updatedAt": "2025-10-24T14:30:00.000Z",
  "project": {},
  "stories": [],
  "comments": []
}
```

**Error Responses**:

- **400 Bad Request** - Invalid date range
```json
{
  "statusCode": 400,
  "message": "End date must be after start date"
}
```

- **404 Not Found** - Sprint not found
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid not found"
}
```

---

### Delete Sprint

Deletes a sprint and removes sprint association from all stories.

**Endpoint**: `DELETE /sprints/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Example**: `DELETE /sprints/sprint-uuid-123`

**Success Response**: `200 OK`
```json
{
  "id": "sprint-uuid-123",
  "name": "Sprint 1",
  "status": "PLANNING",
  "project": {},
  "stories": [],
  "comments": []
}
```

**Behavior**:
- Removes sprint association from all stories (sets `sprintId` to `null`)
- Stories are moved back to product backlog
- Sprint comments are deleted
- Sprint is permanently deleted

**Error Response**: `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Start Sprint

Transitions a sprint from PLANNING to ACTIVE status.

**Endpoint**: `POST /sprints/:id/start`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**: None

**Example**: `POST /sprints/sprint-uuid-123/start`

**Success Response**: `201 Created`
```json
{
  "id": "sprint-uuid-123",
  "name": "Sprint 1",
  "goal": "User authentication",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "capacity": 40,
  "velocity": null,
  "status": "ACTIVE",
  "projectId": "project-uuid",
  "createdAt": "2025-10-24T12:00:00.000Z",
  "updatedAt": "2025-10-24T15:00:00.000Z",
  "project": {},
  "stories": [],
  "comments": []
}
```

**Business Rules**:
- Sprint must be in PLANNING status
- Only one ACTIVE sprint allowed per project
- No date validation (sprint can be started before start date)

**Error Responses**:

- **400 Bad Request** - Invalid status
```json
{
  "statusCode": 400,
  "message": "Only sprints in PLANNING status can be started"
}
```

- **409 Conflict** - Another sprint already active
```json
{
  "statusCode": 409,
  "message": "Cannot start sprint: Another sprint is already active in this project"
}
```

- **404 Not Found** - Sprint not found
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Complete Sprint

Transitions a sprint from ACTIVE to COMPLETED status and calculates velocity.

**Endpoint**: `POST /sprints/:id/complete`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**: None

**Example**: `POST /sprints/sprint-uuid-123/complete`

**Success Response**: `201 Created`
```json
{
  "id": "sprint-uuid-123",
  "name": "Sprint 1",
  "goal": "User authentication",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "capacity": 40,
  "velocity": 35,
  "status": "COMPLETED",
  "projectId": "project-uuid",
  "createdAt": "2025-10-24T12:00:00.000Z",
  "updatedAt": "2025-01-14T18:00:00.000Z",
  "project": {},
  "stories": [
    {
      "id": "story-uuid",
      "title": "User login",
      "storyPoints": 8,
      "status": "DONE"
    }
  ],
  "comments": []
}
```

**Automatic Actions**:
1. **Calculates Velocity**: Sum of story points from completed (DONE) stories
2. **Moves Incomplete Stories**: Stories not in DONE status are moved back to backlog (sprintId set to null)
3. **Updates Status**: Sprint status set to COMPLETED
4. **Updates Timestamp**: updatedAt field is refreshed

**Business Rules**:
- Sprint must be in ACTIVE status
- Velocity is calculated automatically based on completed stories
- Incomplete stories are automatically moved to backlog

**Error Responses**:

- **400 Bad Request** - Invalid status
```json
{
  "statusCode": 400,
  "message": "Only active sprints can be completed"
}
```

- **404 Not Found** - Sprint not found
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Add Stories

Adds multiple user stories to a sprint.

**Endpoint**: `POST /sprints/:id/stories`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**:
```json
{
  "storyIds": [
    "story-uuid-1",
    "story-uuid-2",
    "story-uuid-3"
  ]
}
```

**Request Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| storyIds | string[] | Yes | Array with min 1 item | Array of story UUIDs |

**Success Response**: `201 Created`
```json
{
  "id": "sprint-uuid",
  "name": "Sprint 1",
  "status": "PLANNING",
  "stories": [
    {
      "id": "story-uuid-1",
      "title": "User registration",
      "storyPoints": 8,
      "status": "TODO"
    },
    {
      "id": "story-uuid-2",
      "title": "User login",
      "storyPoints": 5,
      "status": "TODO"
    },
    {
      "id": "story-uuid-3",
      "title": "Password reset",
      "storyPoints": 3,
      "status": "TODO"
    }
  ]
}
```

**Business Rules**:
- All stories must exist
- All stories must belong to the same project as the sprint
- Stories can be moved from another sprint (previous sprintId is overwritten)
- Stories already in the sprint are updated (no duplicates)

**Error Responses**:

- **404 Not Found** - One or more stories don't exist
```json
{
  "statusCode": 404,
  "message": "One or more stories not found"
}
```

- **400 Bad Request** - Stories from different project
```json
{
  "statusCode": 400,
  "message": "All stories must belong to the same project as the sprint"
}
```

- **404 Not Found** - Sprint not found
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid not found"
}
```

---

### Remove Story

Removes a single story from a sprint (moves back to backlog).

**Endpoint**: `DELETE /sprints/:id/stories/:storyId`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |
| storyId | string | Yes | Story UUID to remove |

**Request Body**: None

**Example**: `DELETE /sprints/sprint-uuid-123/stories/story-uuid-456`

**Success Response**: `200 OK`
```json
{
  "id": "sprint-uuid-123",
  "name": "Sprint 1",
  "status": "PLANNING",
  "stories": [
    {
      "id": "story-uuid-789",
      "title": "Remaining story"
    }
  ]
}
```

**Behavior**:
- Story's `sprintId` is set to `null`
- Story is moved back to product backlog
- Story is not deleted

**Error Responses**:

- **404 Not Found** - Story doesn't exist
```json
{
  "statusCode": 404,
  "message": "Story with ID story-uuid-456 not found"
}
```

- **400 Bad Request** - Story not in this sprint
```json
{
  "statusCode": 400,
  "message": "Story does not belong to this sprint"
}
```

- **404 Not Found** - Sprint not found
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Get Metrics

Retrieves comprehensive sprint metrics and burndown chart data.

**Endpoint**: `GET /sprints/:id/metrics`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**: None

**Example**: `GET /sprints/sprint-uuid-123/metrics`

**Success Response**: `200 OK`
```json
{
  "totalStoryPoints": 48,
  "completedStoryPoints": 35,
  "remainingStoryPoints": 13,
  "completionPercentage": 72.92,
  "storiesCount": {
    "total": 8,
    "todo": 1,
    "inProgress": 2,
    "done": 4,
    "blocked": 1
  },
  "velocity": 35,
  "burndownData": [
    {
      "date": "2025-01-01",
      "remainingPoints": 48,
      "idealRemaining": 48
    },
    {
      "date": "2025-01-02",
      "remainingPoints": 48,
      "idealRemaining": 44
    },
    {
      "date": "2025-01-03",
      "remainingPoints": 48,
      "idealRemaining": 41
    },
    {
      "date": "2025-01-14",
      "remainingPoints": 48,
      "idealRemaining": 0
    }
  ]
}
```

**Response Schema**:
| Field | Type | Description |
|-------|------|-------------|
| totalStoryPoints | number | Sum of all story points in sprint |
| completedStoryPoints | number | Sum of story points with DONE status |
| remainingStoryPoints | number | Total - Completed |
| completionPercentage | number | (Completed / Total) * 100, rounded to 2 decimals |
| storiesCount | object | Story counts by status |
| storiesCount.total | number | Total number of stories |
| storiesCount.todo | number | Stories in TODO status |
| storiesCount.inProgress | number | Stories in IN_PROGRESS status |
| storiesCount.done | number | Stories in DONE status |
| storiesCount.blocked | number | Stories in BLOCKED status |
| velocity | number | Optional. Only present for completed sprints |
| burndownData | array | Daily burndown chart data points |

**Burndown Data Point Schema**:
| Field | Type | Description |
|-------|------|-------------|
| date | string | Date in YYYY-MM-DD format |
| remainingPoints | number | Actual remaining story points (currently static) |
| idealRemaining | number | Ideal remaining points following linear burndown |

**Notes**:
- `remainingPoints` in burndown data is currently static (shows total points for all dates)
- In production implementation, this would track actual daily progress
- `idealRemaining` shows perfect linear burndown from start to end
- Burndown chart includes start date, end date, and all days in between

**Error Response**: `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

### Add Comment

Adds a comment to a sprint.

**Endpoint**: `POST /sprints/:id/comments`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**:
```json
{
  "content": "Great progress today! Let's maintain this velocity.",
  "type": "GENERAL"
}
```

**Request Schema**:
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| content | string | Yes | Not empty | Comment text content |
| type | enum | No | See Comment Types | Comment category (defaults to GENERAL) |

**Comment Types**:
- `GENERAL` - General discussion (default)
- `IMPEDIMENT` - Blocked or impediment
- `DECISION` - Decision made
- `QUESTION` - Question or clarification needed
- `ANSWER` - Answer to a question
- `ACTION_ITEM` - Action item or task

**Authentication**:
- Author ID is automatically extracted from JWT token
- Uses `sub` field or `id` field from token payload

**Success Response**: `201 Created`
```json
{
  "id": "comment-uuid",
  "content": "Great progress today! Let's maintain this velocity.",
  "type": "GENERAL",
  "sprintId": "sprint-uuid",
  "authorId": "user-uuid",
  "createdAt": "2025-01-05T14:30:00.000Z",
  "updatedAt": "2025-01-05T14:30:00.000Z",
  "author": {
    "id": "user-uuid",
    "email": "pm@example.com",
    "fullName": "Jane PM"
  },
  "sprint": {
    "id": "sprint-uuid",
    "name": "Sprint 1"
  }
}
```

**Error Response**: `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid not found"
}
```

---

### Get Comments

Retrieves all comments for a sprint.

**Endpoint**: `GET /sprints/:id/comments`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Sprint UUID |

**Request Body**: None

**Example**: `GET /sprints/sprint-uuid-123/comments`

**Success Response**: `200 OK`
```json
[
  {
    "id": "comment-uuid-1",
    "content": "Sprint review scheduled for Friday",
    "type": "GENERAL",
    "sprintId": "sprint-uuid-123",
    "authorId": "user-uuid-1",
    "createdAt": "2025-01-05T10:00:00.000Z",
    "updatedAt": "2025-01-05T10:00:00.000Z",
    "author": {
      "id": "user-uuid-1",
      "email": "pm@example.com",
      "fullName": "Jane PM"
    }
  },
  {
    "id": "comment-uuid-2",
    "content": "Blocked by infrastructure team",
    "type": "IMPEDIMENT",
    "sprintId": "sprint-uuid-123",
    "authorId": "user-uuid-2",
    "createdAt": "2025-01-04T14:30:00.000Z",
    "updatedAt": "2025-01-04T14:30:00.000Z",
    "author": {
      "id": "user-uuid-2",
      "email": "dev@example.com",
      "fullName": "John Developer"
    }
  }
]
```

**Sorting**: Comments are ordered by creation date (newest first).

**Error Response**: `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Sprint with ID sprint-uuid-123 not found"
}
```

---

## Data Models

### Sprint Entity

```typescript
{
  id: string                    // UUID
  name: string                  // Sprint name
  goal?: string                 // Sprint goal/objective
  startDate: Date               // Sprint start date
  endDate: Date                 // Sprint end date
  capacity?: number             // Team capacity in story points
  velocity?: number             // Actual velocity (set on completion)
  status: SprintStatus          // PLANNING | ACTIVE | COMPLETED
  projectId: string             // Parent project UUID
  createdAt: Date               // Creation timestamp
  updatedAt: Date               // Last update timestamp
  project?: Project             // Related project (included in responses)
  stories?: Story[]             // Related stories (included in responses)
  comments?: SprintComment[]    // Related comments (included in responses)
  retrospectives?: Retrospective[] // Related retrospectives
}
```

### Story Entity (Summary)

```typescript
{
  id: string                    // UUID
  title: string                 // Story title
  description?: string          // Story description
  storyPoints?: number          // Story point estimate
  status: StoryStatus           // TODO | IN_PROGRESS | DONE | BLOCKED
  priority: Priority            // LOW | MEDIUM | HIGH | CRITICAL
  rank: number                  // Display order
  sprintId?: string             // Sprint UUID (null if in backlog)
  projectId: string             // Parent project UUID
  assigneeId?: string           // Assigned user UUID
  creatorId: string             // Creator user UUID
  assignee?: User               // Assigned user object
  creator?: User                // Creator user object
  tasks?: Task[]                // Related tasks
  comments?: Comment[]          // Related comments
}
```

### SprintComment Entity

```typescript
{
  id: string                    // UUID
  content: string               // Comment text
  type: CommentType             // GENERAL | IMPEDIMENT | DECISION | etc.
  sprintId: string              // Sprint UUID
  authorId: string              // Author user UUID
  createdAt: Date               // Creation timestamp
  updatedAt: Date               // Last update timestamp
  author?: User                 // Author user object
  sprint?: Sprint               // Related sprint object
}
```

### User Entity (Summary)

```typescript
{
  id: string                    // UUID
  email: string                 // User email
  fullName?: string             // User full name
}
```

### Project Entity (Summary)

```typescript
{
  id: string                    // UUID
  name: string                  // Project name
  key: string                   // Project key (e.g., "PROJ")
  description?: string          // Project description
}
```

### SprintMetrics DTO

```typescript
{
  totalStoryPoints: number             // Sum of all story points
  completedStoryPoints: number         // Sum of completed story points
  remainingStoryPoints: number         // Total - Completed
  completionPercentage: number         // Completion % (2 decimals)
  storiesCount: {
    total: number                      // Total story count
    todo: number                       // TODO stories
    inProgress: number                 // IN_PROGRESS stories
    done: number                       // DONE stories
    blocked: number                    // BLOCKED stories
  }
  velocity?: number                    // Actual velocity (completed sprints only)
  burndownData: BurndownDataPoint[]    // Daily burndown data
}
```

### BurndownDataPoint Interface

```typescript
{
  date: string                   // Date in YYYY-MM-DD format
  remainingPoints: number        // Actual remaining story points
  idealRemaining: number         // Ideal remaining story points
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "statusCode": number,
  "message": string,
  "error"?: string
}
```

### HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid input, validation errors, date range errors |
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Not Found | Sprint, story, or comment not found |
| 409 | Conflict | Overlapping sprint dates, multiple active sprints |
| 500 | Internal Server Error | Unexpected server errors |

### Common Error Scenarios

**Authentication Errors**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Validation Errors**:
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "startDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

**Not Found Errors**:
```json
{
  "statusCode": 404,
  "message": "Sprint with ID {id} not found"
}
```

**Business Logic Errors**:
```json
{
  "statusCode": 400,
  "message": "Only sprints in PLANNING status can be started"
}
```

```json
{
  "statusCode": 409,
  "message": "Sprint dates overlap with existing active or planning sprint"
}
```

---

## Rate Limiting

**Current Implementation**: No rate limiting implemented.

**Recommended Limits** (for production):
- **Standard Users**: 100 requests per minute per user
- **Admin Users**: 500 requests per minute per user
- **Burst Limit**: 150% of standard limit for 10 seconds

**Rate Limit Headers** (when implemented):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Best Practices

### Creating Sprints

1. **Plan Capacity**: Set realistic capacity based on team size and availability
2. **Define Clear Goals**: Write specific, measurable sprint goals
3. **Avoid Overlap**: Ensure sprint dates don't overlap with existing sprints
4. **Standard Duration**: Use consistent sprint duration (1-4 weeks recommended)

### Managing Sprint Lifecycle

1. **Start Sprints On Time**: Start sprint at the planned start date
2. **Daily Updates**: Update story status daily for accurate burndown tracking
3. **Complete Properly**: Always use Complete Sprint endpoint (don't manually set status)
4. **Handle Incomplete Work**: Review incomplete stories before completion

### Story Management

1. **Batch Operations**: Add multiple stories in one request
2. **Story Points**: Estimate all stories before adding to sprint
3. **Capacity Management**: Don't exceed sprint capacity
4. **Story Status**: Keep story statuses up to date

### Comments & Collaboration

1. **Use Comment Types**: Categorize comments with appropriate types
2. **Document Decisions**: Use DECISION type for important decisions
3. **Track Impediments**: Use IMPEDIMENT type for blockers
4. **Regular Updates**: Add daily standup notes

### Metrics & Reporting

1. **Track Daily**: Monitor metrics daily for accurate burndown
2. **Review Velocity**: Use completed sprint velocity for future planning
3. **Analyze Trends**: Compare metrics across multiple sprints
4. **Adjust Capacity**: Refine capacity estimates based on historical velocity

---

## Integration Examples

### Complete Sprint Workflow

```typescript
// 1. Create sprint
const sprint = await fetch('/api/sprints', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Sprint 1',
    goal: 'User authentication',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-01-14T23:59:59.999Z',
    capacity: 40,
    projectId: projectId
  })
});

// 2. Add stories to sprint
await fetch(`/api/sprints/${sprint.id}/stories`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    storyIds: ['story-1', 'story-2', 'story-3']
  })
});

// 3. Start sprint
await fetch(`/api/sprints/${sprint.id}/start`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});

// 4. Monitor progress
const metrics = await fetch(`/api/sprints/${sprint.id}/metrics`, {
  headers: { 'Authorization': 'Bearer ' + token }
});

// 5. Add comments
await fetch(`/api/sprints/${sprint.id}/comments`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Great progress today!',
    type: 'GENERAL'
  })
});

// 6. Complete sprint
await fetch(`/api/sprints/${sprint.id}/complete`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
```

### Error Handling Example

```typescript
async function createSprint(data) {
  try {
    const response = await fetch('/api/sprints', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 400:
          console.error('Validation error:', error.message);
          break;
        case 409:
          console.error('Sprint conflict:', error.message);
          break;
        case 401:
          console.error('Authentication required');
          // Redirect to login
          break;
        default:
          console.error('Unexpected error:', error);
      }

      throw new Error(error.message);
    }

    return await response.json();
  } catch (err) {
    console.error('Network error:', err);
    throw err;
  }
}
```

---

## Changelog

### v1.0.0 (Current)
- Initial release
- 12 core sprint management endpoints
- JWT authentication
- Sprint lifecycle management
- Story assignment and removal
- Metrics and burndown tracking
- Comment system

---

## Support

For API support, please contact:
- **Technical Issues**: Create an issue in the project repository
- **Feature Requests**: Submit via project management board
- **Security Issues**: Contact security team directly

---

**Last Updated**: 2025-10-24
**API Version**: v1.0.0
**Base URL**: `/api/sprints`

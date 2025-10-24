# Existing Codebase Analysis

## Overview
Comprehensive analysis of the scrumboard application's existing patterns, architecture, and implementation strategies to ensure Epic 3 (Sprint Management) follows established conventions.

---

## 1. Database Schema Analysis (Prisma)

### Sprint Model (Already Exists)
The `Sprint` model in `schema.prisma` is well-designed with excellent field structure:

```prisma
model Sprint {
  id          String      @id @default(cuid())
  name        String
  goal        String?
  startDate   DateTime
  endDate     DateTime
  status      SprintStatus @default(PLANNING)
  capacity    Int?        // Team capacity in story points
  velocity    Int?        // Actual velocity after completion
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  projectId String
  project   Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stories   Story[]
  comments  SprintComment[]
  retrospectives Retrospective[]
}

enum SprintStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}
```

**Key Observations:**
- Excellent field coverage for sprint metrics (capacity, velocity)
- Proper status enum with complete lifecycle states
- Well-defined relationships (project, stories, comments, retrospectives)
- Built-in audit fields (createdAt, updatedAt)

### Story Model Sprint Relationship
```prisma
model Story {
  sprintId String?
  sprint   Sprint? @relation(fields: [sprintId], references: [id])
}
```

**Findings:**
- Stories can be unassigned (null sprintId) for backlog stories
- Optional relationship allows flexible sprint planning
- Stories can be moved between sprints easily

### Comment Architecture
```prisma
model SprintComment {
  id        String   @id @default(cuid())
  content   String
  type      CommentType @default(GENERAL)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sprintId String
  sprint   Sprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)

  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}

enum CommentType {
  GENERAL
  IMPEDIMENT
  QUESTION
  DECISION
  ACTION_ITEM
}
```

**Pattern Insights:**
- Type-categorized comments for filtering and display
- Author tracking for accountability
- Cascade delete on sprint removal
- Shared comment type enum across sprint and story comments

---

## 2. Backend Service Patterns (NestJS)

### Service Architecture Pattern

**Location**: `apps/api/src/stories/stories.service.ts`

**Pattern Observed:**
```typescript
@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateDto): Promise<Entity> {
    return this.prisma.entity.create({
      data: { ...dto },
      include: { /* all relations */ }
    })
  }

  async findAll(filters?: Filters): Promise<Entity[]> {
    const where = {} // Build dynamic filters
    return this.prisma.entity.findMany({
      where,
      include: { /* all relations */ },
      orderBy: [{ field: 'asc' }]
    })
  }

  async findOne(id: string): Promise<Entity> {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: { /* all relations */ }
    })

    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`)
    }

    return entity
  }

  async update(id: string, updateDto: UpdateDto): Promise<Entity> {
    await this.findOne(id) // Verify exists

    return this.prisma.entity.update({
      where: { id },
      data: { ...updateDto, updatedAt: new Date() },
      include: { /* all relations */ }
    })
  }

  async remove(id: string): Promise<Entity> {
    await this.findOne(id) // Verify exists

    return this.prisma.entity.delete({
      where: { id },
      include: { /* all relations */ }
    })
  }
}
```

**Key Service Patterns:**
1. **Dependency Injection**: PrismaService injected via constructor
2. **Comprehensive Includes**: All relations included in queries for complete data
3. **Error Handling**: NotFoundException for missing entities
4. **Validation**: Check entity exists before update/delete
5. **Ordering**: Default ordering on list queries
6. **Timestamps**: Explicit updatedAt on updates

### Advanced Service Pattern (Projects)

**Location**: `apps/api/src/projects/services/projects.service.ts`

**Authorization Pattern:**
```typescript
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teamId: string, createDto: CreateDto, userId: string): Promise<Entity> {
    // Verify user is a team member
    await this.verifyTeamMembership(teamId, userId)

    const entity = await this.prisma.entity.create({ /* ... */ })
    return plainToInstance(ResponseDto, entity)
  }

  private async verifyTeamMembership(teamId: string, userId: string): Promise<void> {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } }
    })

    if (!membership) {
      throw new ForbiddenException('You are not a member of this team')
    }
  }

  private async verifyTeamAdmin(teamId: string, userId: string): Promise<void> {
    const membership = await this.verifyTeamMembership(teamId, userId)

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only team admins can perform this action')
    }
  }
}
```

**Authorization Patterns:**
1. **Team-Based Access Control**: Verify team membership before operations
2. **Role-Based Operations**: Admin checks for sensitive operations
3. **User Context**: userId passed from JWT token via @CurrentUser decorator
4. **Private Helper Methods**: Reusable authorization checks
5. **Clear Error Messages**: Descriptive ForbiddenException messages

### DTO Pattern (Data Transfer Objects)

**Location**: `apps/api/src/stories/dto/create-story.dto.ts`

**Validation Pattern:**
```typescript
export class CreateStoryDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  storyPoints?: number

  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus

  @IsOptional()
  @IsString()
  projectId?: string
}

export class UpdateStoryDto extends PartialType(CreateStoryDto) {}
```

**DTO Patterns:**
1. **Class-Validator Decorators**: Type validation with decorators
2. **Optional Fields**: @IsOptional for nullable fields
3. **Enum Validation**: @IsEnum for type-safe enums
4. **Range Validation**: @Min/@Max for numeric constraints
5. **Inheritance**: UpdateDto extends PartialType(CreateDto)

---

## 3. Controller Patterns (NestJS)

### REST API Pattern

**Location**: `apps/api/src/stories/stories.controller.ts`

**Controller Structure:**
```typescript
@Controller('stories')
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Post()
  create(@Body() createDto: CreateDto) {
    return this.service.create(createDto)
  }

  @Get()
  findAll(@Query('filter') filter?: string) {
    return this.service.findAll(filter)
  }

  @Get('by-status/:status')
  getByStatus(
    @Param('status') status: Status,
    @Query('projectId') projectId?: string
  ) {
    return this.service.getByStatus(status, projectId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    return this.service.update(id, updateDto)
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: Status) {
    return this.service.updateStatus(id, status)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
```

**Controller Patterns:**
1. **RESTful Routes**: Standard CRUD operations (GET, POST, PATCH, DELETE)
2. **Decorator-Based Routing**: @Get, @Post, @Patch, @Delete
3. **Parameter Extraction**: @Param for path params, @Query for query params, @Body for request body
4. **Specialized Endpoints**: Custom endpoints like `/by-status/:status`
5. **HTTP Method Semantics**: PATCH for partial updates, PUT for specific field updates

### Authenticated Controller Pattern

**Location**: `apps/api/src/projects/projects.controller.ts`

**Auth & Swagger Pattern:**
```typescript
@ApiTags('projects')
@Controller('teams/:teamId/projects')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new project in a team' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'User is not a member' })
  async create(
    @Param('teamId') teamId: string,
    @Body() createDto: CreateDto,
    @CurrentUser() user: any
  ): Promise<ResponseDto> {
    return this.service.create(teamId, createDto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.service.remove(id, user.sub)
  }
}
```

**Advanced Controller Patterns:**
1. **Swagger Documentation**: @ApiTags, @ApiOperation, @ApiResponse
2. **JWT Guards**: @UseGuards(SimpleJwtAuthGuard) for authentication
3. **Bearer Auth**: @ApiBearerAuth() for Swagger UI
4. **Rate Limiting**: @Throttle decorator for request throttling
5. **Current User**: @CurrentUser() decorator to extract JWT payload
6. **HTTP Status Codes**: @HttpCode for custom status codes
7. **Nested Routes**: Teams/:teamId/projects pattern for hierarchical resources

---

## 4. Authentication & Authorization

### JWT Pattern

**Location**: `apps/api/src/auth/decorators/current-user.decorator.ts`

**Decorator Implementation:**
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  }
)
```

**JWT Payload Structure:**
```typescript
interface JwtPayload {
  sub: string  // User ID
  email: string
  role: UserRole
}
```

**Auth Flow:**
1. **Guard Validation**: SimpleJwtAuthGuard validates JWT token
2. **User Injection**: JWT payload attached to request.user
3. **Decorator Access**: @CurrentUser() extracts user from request
4. **Service Authorization**: Services verify team membership/role

### Authorization Levels

**Identified Patterns:**
1. **Public**: No guard required (login, register)
2. **Authenticated**: @UseGuards(SimpleJwtAuthGuard) - any logged-in user
3. **Team Member**: Service-level check via verifyTeamMembership()
4. **Team Admin**: Service-level check via verifyTeamAdmin()
5. **Role-Based**: UserRole enum (ADMIN, SCRUM_MASTER, PRODUCT_OWNER, DEVELOPER, STAKEHOLDER, MEMBER)

---

## 5. Frontend Architecture (Next.js/React)

### Component Patterns

**Location**: `apps/web/src/components/board/Board.tsx`

**State Management Pattern:**
```typescript
const [columns, setColumns] = useState<Column[]>([])
const [activeStory, setActiveStory] = useState<Story | null>(null)
const [loadingState, setLoadingState] = useState<LoadingState>({
  isLoading: true,
  operations: new Set()
})
const [error, setError] = useState<ErrorState | null>(null)
const [lastSuccessfulState, setLastSuccessfulState] = useState<Column[]>([])
```

**Key Frontend Patterns:**
1. **Optimistic Updates**: Update UI immediately, rollback on error
2. **Operation Tracking**: Set of active operations for granular loading states
3. **Error Recovery**: Last successful state cache for offline resilience
4. **Auto-Retry**: Exponential backoff for network errors
5. **User Feedback**: Toast notifications for all operations

### API Client Pattern

**Location**: `apps/web/src/lib/api.ts`

**Error Handling:**
```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: Error,
    public isNetworkError: boolean = false
  ) {
    super(message)
  }

  get isRetryable(): boolean {
    return this.isNetworkError || this.isServerError
  }

  getUserFriendlyMessage(): string {
    // Return user-friendly messages based on status code
  }
}
```

**Retry Logic:**
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (!error.isRetryable || attempt === maxRetries) throw error
      await sleep(Math.min(delay, maxDelay))
      delay *= backoffFactor
    }
  }
}
```

**API Patterns:**
1. **Custom Error Class**: Rich error information with retry capability
2. **Automatic Retry**: Built-in retry with exponential backoff
3. **User-Friendly Messages**: Transform technical errors to user messages
4. **Type Safety**: TypeScript generics for response types
5. **Centralized Configuration**: Single API_URL configuration

### UI Component Pattern

**Location**: `apps/web/src/components/project/ProjectCard.tsx`

**Component Structure:**
```typescript
export interface ProjectCardProps {
  project: Project
  onView?: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  isLoading?: boolean
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      {/* Card content with status badges, metrics, actions */}
    </div>
  )
}
```

**UI Patterns:**
1. **Props Interface**: Clear TypeScript interface for component props
2. **Optional Callbacks**: Optional event handlers for flexibility
3. **Loading States**: isLoading prop for async operations
4. **Status Styling**: Color-coded badges for status visualization
5. **Responsive Design**: Tailwind CSS for responsive layouts
6. **Dark Mode Support**: Dark mode variants in Tailwind classes

---

## 6. Code Organization

### Backend Structure
```
apps/api/src/
├── prisma/
│   └── prisma.service.ts
├── auth/
│   ├── guards/
│   ├── decorators/
│   ├── services/
│   └── dto/
├── [resource]/
│   ├── services/
│   │   └── [resource].service.ts
│   ├── dto/
│   │   ├── create-[resource].dto.ts
│   │   ├── update-[resource].dto.ts
│   │   └── [resource]-response.dto.ts
│   ├── [resource].controller.ts
│   └── [resource].module.ts
```

**Organization Principles:**
1. **Feature Modules**: Each resource in its own folder
2. **Separation of Concerns**: Services, DTOs, controllers separated
3. **Shared Services**: Prisma, Auth services shared across modules
4. **Nested Folders**: Services and DTOs in subfolders for clarity

### Frontend Structure
```
apps/web/src/
├── components/
│   ├── [feature]/
│   │   ├── Component.tsx
│   │   └── __tests__/Component.test.tsx
│   ├── forms/
│   ├── modals/
│   └── ui/
├── lib/
│   ├── [resource]/
│   │   └── api.ts
│   ├── api.ts
│   └── auth/
├── app/
│   └── [routes]/
└── types/
    └── index.ts
```

**Organization Principles:**
1. **Component Co-location**: Tests alongside components
2. **Feature-Based**: Components grouped by feature
3. **Shared Utilities**: Common UI components in ui/ folder
4. **API Clients**: Separate API modules per resource
5. **Type Definitions**: Centralized types folder

---

## 7. Testing Patterns

### Backend Testing (Observed from service files)
**Patterns Expected:**
- Unit tests for service methods
- Mock PrismaService for isolated testing
- Test NotFoundException throwing
- Test authorization checks

### Frontend Testing (Observed from component tests)
**Pattern from test file locations:**
```
components/[feature]/__tests__/Component.test.tsx
```

**Expected Patterns:**
- Jest + React Testing Library
- Component rendering tests
- User interaction tests
- API mocking for integration tests

---

## 8. Best Practices Identified

### Naming Conventions
1. **Files**: kebab-case (create-story.dto.ts, stories.service.ts)
2. **Classes**: PascalCase (StoriesService, CreateStoryDto)
3. **Interfaces**: PascalCase with Props suffix (ProjectCardProps)
4. **Variables**: camelCase (loadingState, activeStory)
5. **Constants**: UPPER_SNAKE_CASE for enums

### Error Handling
1. **Specific Exceptions**: NotFoundException, ForbiddenException
2. **Validation**: class-validator decorators on DTOs
3. **User-Friendly Messages**: Transform technical errors for users
4. **Error Recovery**: Retry logic, fallback states

### Performance Patterns
1. **Memoization**: useMemo for expensive computations (Map lookups)
2. **Optimistic Updates**: Immediate UI feedback, rollback on error
3. **Batch Operations**: Single state updates for multiple changes
4. **Selective Queries**: Include only needed relations

### Security Patterns
1. **Authentication**: JWT-based authentication
2. **Authorization**: Service-level team membership checks
3. **Input Validation**: class-validator on all DTOs
4. **Rate Limiting**: @Throttle decorator on sensitive endpoints
5. **Cascade Deletes**: Automatic cleanup on parent deletion

---

## 9. Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger (@nestjs/swagger)

### Frontend
- **Framework**: Next.js 14.x (App Router)
- **UI Library**: React 18.x
- **Styling**: Tailwind CSS 3.x
- **Drag & Drop**: @dnd-kit
- **HTTP Client**: fetch with custom retry logic
- **Testing**: Jest, React Testing Library

---

## 10. Recommendations for Epic 3 Implementation

### API Design
1. **Follow Projects Pattern**: Nested routes under /teams/:teamId/projects/:projectId/sprints
2. **Use Authorization Checks**: Verify team membership before operations
3. **Include Relations**: Load stories, comments in sprint queries
4. **Implement Specialized Endpoints**: /sprints/active, /sprints/:id/metrics, /sprints/:id/assign-story

### Service Implementation
1. **Verify Existence**: Check sprint exists before update/delete
2. **Authorization**: Team member check for read, admin check for create/update/delete
3. **Metrics Calculation**: Helper methods for velocity, burndown, completion percentage
4. **Story Assignment**: Validate story belongs to same project before sprint assignment

### Frontend Components
1. **Card-Based UI**: Follow ProjectCard pattern for SprintCard
2. **Optimistic Updates**: Implement same pattern as Board for sprint story assignment
3. **Loading States**: Granular operation tracking for async actions
4. **Error Recovery**: Auto-retry and cached state fallback

### Testing Strategy
1. **Service Tests**: Mock PrismaService, test all CRUD operations
2. **Controller Tests**: Test authentication, authorization, route handling
3. **Component Tests**: Test rendering, user interactions, API integration
4. **E2E Tests**: Test complete sprint workflow (create → plan → activate → complete)

---

## Summary

The codebase demonstrates excellent architectural patterns:
- **Consistent Structure**: Clear separation of concerns
- **Type Safety**: TypeScript throughout
- **Error Handling**: Comprehensive error recovery
- **Authorization**: Robust team-based access control
- **User Experience**: Optimistic updates, loading states, auto-retry

Epic 3 should follow these established patterns for consistency and maintainability.

# Sprint UI Patterns and Component Architecture

## Overview
Frontend component design patterns for Sprint Management features following established UI patterns from the scrumboard application.

---

## 1. Sprint Dashboard Layout

### 1.1 Main Sprint Dashboard Page

**Location:** `apps/web/src/app/teams/[teamId]/projects/[projectId]/sprints/page.tsx`

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Sprint Dashboard Header                                     │
│  [Active Sprint Banner] [Create Sprint Button]              │
├─────────────────────────────────────────────────────────────┤
│  Sprint List / Grid                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ SprintCard   │ │ SprintCard   │ │ SprintCard   │        │
│  │ (Active)     │ │ (Planning)   │ │ (Completed)  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Component Hierarchy:**
```tsx
<SprintDashboard>
  <DashboardHeader>
    <ActiveSprintBanner />
    <CreateSprintButton />
    <SprintFilters />
  </DashboardHeader>

  <SprintGrid>
    {sprints.map(sprint => (
      <SprintCard key={sprint.id} sprint={sprint} />
    ))}
  </SprintGrid>
</SprintDashboard>
```

---

## 2. Core Sprint Components

### 2.1 SprintCard Component

**Purpose:** Display sprint overview with key metrics and actions

**Pattern:** Follow ProjectCard component structure

**File:** `apps/web/src/components/sprint/SprintCard.tsx`

**Props Interface:**
```typescript
export interface SprintCardProps {
  sprint: Sprint
  onView?: (sprint: Sprint) => void
  onEdit?: (sprint: Sprint) => void
  onDelete?: (sprint: Sprint) => void
  onStart?: (sprint: Sprint) => void
  onComplete?: (sprint: Sprint) => void
  isLoading?: boolean
}
```

**Visual Layout:**
```
┌─────────────────────────────────────────┐
│ Sprint 1            [ACTIVE]            │
│ Goal: Complete user dashboard           │
├─────────────────────────────────────────┤
│ 📊 15 Stories    ⏱ 5 days left         │
│ 📈 45/60 points  🔥 9 pts/day           │
├─────────────────────────────────────────┤
│ Progress Bar: ████████░░░░ 75%         │
├─────────────────────────────────────────┤
│ [View Details] [Edit] [Complete]        │
└─────────────────────────────────────────┘
```

**Component Structure:**
```tsx
export const SprintCard: React.FC<SprintCardProps> = ({
  sprint,
  onView,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  isLoading = false
}) => {
  const metrics = calculateSprintMetrics(sprint)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header with name and status badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{sprint.name}</h3>
          <SprintStatusBadge status={sprint.status} />
        </div>
      </div>

      {/* Goal */}
      {sprint.goal && (
        <p className="text-sm text-gray-600 mb-4">{sprint.goal}</p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <MetricDisplay
          icon={<FileText />}
          label="Stories"
          value={metrics.storyCount}
        />
        <MetricDisplay
          icon={<Clock />}
          label="Days Left"
          value={metrics.daysRemaining}
        />
        <MetricDisplay
          icon={<TrendingUp />}
          label="Story Points"
          value={`${metrics.completedPoints}/${metrics.totalPoints}`}
        />
        <MetricDisplay
          icon={<Zap />}
          label="Velocity"
          value={metrics.velocity ? `${metrics.velocity} pts/day` : 'N/A'}
        />
      </div>

      {/* Progress Bar */}
      <ProgressBar
        progress={metrics.completionPercentage}
        className="mb-4"
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onView && (
          <Button onClick={() => onView(sprint)} variant="outline" size="sm">
            View Details
          </Button>
        )}
        {sprint.status === 'PLANNING' && onStart && (
          <Button onClick={() => onStart(sprint)} variant="primary" size="sm">
            Start Sprint
          </Button>
        )}
        {sprint.status === 'ACTIVE' && onComplete && (
          <Button onClick={() => onComplete(sprint)} variant="success" size="sm">
            Complete Sprint
          </Button>
        )}
        {onEdit && (
          <Button onClick={() => onEdit(sprint)} variant="ghost" size="sm">
            Edit
          </Button>
        )}
        {onDelete && sprint.status !== 'ACTIVE' && (
          <Button onClick={() => onDelete(sprint)} variant="danger" size="sm">
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Status Badge Colors:**
```typescript
const STATUS_COLORS = {
  PLANNING: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800'
}
```

---

### 2.2 Sprint Detail View

**Purpose:** Full sprint view with stories, metrics, and burndown chart

**File:** `apps/web/src/app/teams/[teamId]/projects/[projectId]/sprints/[sprintId]/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Sprint Header                                                   │
│  Sprint 1 [ACTIVE]                     [Edit] [Complete]        │
│  Goal: Complete user dashboard                                  │
│  Oct 20 - Oct 27 (7 days)                                       │
├─────────────────────────────────────────────────────────────────┤
│  Tab Navigation                                                  │
│  [Board] [Metrics] [Burndown] [Comments]                        │
├─────────────────────────────────────────────────────────────────┤
│  Tab Content Area                                                │
│                                                                   │
│  (Changes based on selected tab)                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Component Structure:**
```tsx
export default function SprintDetailPage({ params }: { params: { sprintId: string } }) {
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'burndown' | 'comments'>('board')
  const { sprint, isLoading, error } = useSprintDetail(params.sprintId)

  return (
    <div className="min-h-screen p-8">
      <SprintHeader sprint={sprint} />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <TabContent>
        {activeTab === 'board' && <SprintBoard sprint={sprint} />}
        {activeTab === 'metrics' && <SprintMetrics sprint={sprint} />}
        {activeTab === 'burndown' && <BurndownChart sprint={sprint} />}
        {activeTab === 'comments' && <SprintComments sprint={sprint} />}
      </TabContent>
    </div>
  )
}
```

---

### 2.3 Sprint Board Component

**Purpose:** Drag-and-drop story management within sprint context

**File:** `apps/web/src/components/sprint/SprintBoard.tsx`

**Pattern:** Based on existing Board component with sprint-specific features

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Sprint Board                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   TODO      │ │ IN PROGRESS │ │    DONE     │          │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤          │
│  │ Story 1     │ │ Story 3     │ │ Story 5     │          │
│  │ 5 pts       │ │ 8 pts       │ │ 3 pts       │          │
│  │             │ │ Story 4     │ │ Story 6     │          │
│  │ Story 2     │ │ 5 pts       │ │ 5 pts       │          │
│  │ 3 pts       │ │             │ │             │          │
│  │             │ │             │ │             │          │
│  │ [+Add]      │ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                              │
│  Summary: 8 pts TODO | 13 pts IN PROGRESS | 8 pts DONE     │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Drag & Drop**: Move stories between columns
2. **Sprint Context**: Only shows stories assigned to this sprint
3. **Add from Backlog**: Button to add stories from project backlog
4. **Point Tracking**: Show story points per column
5. **Optimistic Updates**: Same pattern as main board

**Component:**
```tsx
export const SprintBoard: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
  const [columns, setColumns] = useState<Column[]>([])
  const [showBacklogModal, setShowBacklogModal] = useState(false)

  // Use same drag-and-drop logic as Board component
  const { handleDragStart, handleDragOver, handleDragEnd } = useDragAndDrop({
    columns,
    setColumns,
    onStatusChange: (storyId, newStatus) => {
      return storiesApi.updateStatus(storyId, newStatus)
    }
  })

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-8 overflow-x-auto pb-8">
        {columns.map(column => (
          <SprintBoardColumn
            key={column.id}
            column={column}
            sprintId={sprint.id}
            onAddFromBacklog={() => setShowBacklogModal(true)}
          />
        ))}
      </div>

      {/* Summary Bar */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <SprintBoardSummary columns={columns} />
      </div>

      {/* Backlog Modal */}
      {showBacklogModal && (
        <BacklogModal
          sprintId={sprint.id}
          onClose={() => setShowBacklogModal(false)}
          onAssignStories={(storyIds) => assignStoriestoSprint(sprint.id, storyIds)}
        />
      )}
    </DndContext>
  )
}
```

---

### 2.4 Sprint Metrics Component

**Purpose:** Display comprehensive sprint metrics and statistics

**File:** `apps/web/src/components/sprint/SprintMetrics.tsx`

**Layout:**
```
┌───────────────────────────────────────────────────────────┐
│  Sprint Metrics                                            │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │ Story Progress  │  │ Point Progress  │  │ Velocity  │ │
│  │                 │  │                 │  │           │ │
│  │  Completed: 5   │  │  Completed: 25  │  │  8.3/day  │ │
│  │  In Progress: 3 │  │  Remaining: 15  │  │           │ │
│  │  Todo: 2        │  │  Total: 40      │  │  Target:  │ │
│  │                 │  │                 │  │  6/day    │ │
│  │  [Pie Chart]    │  │  [Progress Bar] │  │           │ │
│  └─────────────────┘  └─────────────────┘  └───────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Time Progress                                          ││
│  │                                                         ││
│  │ Start: Oct 20         Current: Oct 25      End: Oct 27││
│  │ Elapsed: 5 days                     Remaining: 2 days ││
│  │                                                         ││
│  │ [█████████████████████░░░░░░] 71% complete            ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Story Breakdown by Priority                            ││
│  │                                                         ││
│  │  🔴 URGENT: 2 stories (10 pts)                         ││
│  │  🟠 HIGH: 3 stories (15 pts)                           ││
│  │  🟡 MEDIUM: 4 stories (12 pts)                         ││
│  │  🟢 LOW: 1 story (3 pts)                               ││
│  └────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

**Component:**
```tsx
export const SprintMetrics: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
  const { metrics, isLoading } = useSprintMetrics(sprint.id)

  if (isLoading) return <MetricsLoader />

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Story Progress Card */}
      <MetricCard title="Story Progress">
        <PieChart
          data={[
            { name: 'Completed', value: metrics.completedStories, color: '#10b981' },
            { name: 'In Progress', value: metrics.inProgressStories, color: '#3b82f6' },
            { name: 'Todo', value: metrics.todoStories, color: '#6b7280' }
          ]}
        />
        <MetricsList>
          <MetricItem label="Completed" value={metrics.completedStories} color="green" />
          <MetricItem label="In Progress" value={metrics.inProgressStories} color="blue" />
          <MetricItem label="Todo" value={metrics.todoStories} color="gray" />
        </MetricsList>
      </MetricCard>

      {/* Point Progress Card */}
      <MetricCard title="Point Progress">
        <ProgressBar
          progress={metrics.completionPercentage}
          showLabel
          height="large"
        />
        <MetricsList>
          <MetricItem label="Completed" value={`${metrics.completedStoryPoints} pts`} />
          <MetricItem label="Remaining" value={`${metrics.remainingStoryPoints} pts`} />
          <MetricItem label="Total" value={`${metrics.totalStoryPoints} pts`} />
        </MetricsList>
      </MetricCard>

      {/* Velocity Card */}
      <MetricCard title="Velocity">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">
            {metrics.currentVelocity.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">points / day</div>
        </div>
        {metrics.targetVelocity && (
          <div className="mt-4 text-sm">
            <span className={metrics.currentVelocity >= metrics.targetVelocity ? 'text-green-600' : 'text-orange-600'}>
              Target: {metrics.targetVelocity} pts/day
            </span>
          </div>
        )}
      </MetricCard>

      {/* Time Progress (Full Width) */}
      <div className="col-span-full">
        <TimeProgressCard sprint={sprint} metrics={metrics} />
      </div>

      {/* Priority Breakdown (Full Width) */}
      <div className="col-span-full">
        <PriorityBreakdownCard metrics={metrics} />
      </div>
    </div>
  )
}
```

---

### 2.5 Burndown Chart Component

**Purpose:** Visual burndown chart for sprint progress tracking

**File:** `apps/web/src/components/sprint/BurndownChart.tsx`

**Chart Library:** Recharts (already in use for other charts)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Sprint Burndown Chart                                       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │ 60 ╮                                                     ││
│  │    │╲                                                    ││
│  │ 50 │ ╲  Ideal ---------------                           ││
│  │    │  ╲                                                  ││
│  │ 40 │   ╲                                                 ││
│  │    │    ●━━━━━●  Actual                                 ││
│  │ 30 │         ╲  ╲                                        ││
│  │    │          ●  ╲                                       ││
│  │ 20 │           ╲  ╲                                      ││
│  │    │            ●  ╲                                     ││
│  │ 10 │             ╲  ╲                                    ││
│  │    │              ╲  ╲                                   ││
│  │  0 ╰───────────────●──╲──────────────────────────────── ││
│  │    Oct 20  Oct 22  Oct 24  Oct 26  Oct 27              ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  Legend: ─── Ideal Burndown  ─●─ Actual Burndown            │
│                                                               │
│  Current Status:                                              │
│  • 20 story points remaining                                 │
│  • 2 days remaining                                          │
│  • Required velocity: 10 pts/day                             │
│  • Current velocity: 8.3 pts/day                             │
│  ⚠️  Sprint may be at risk - velocity below target           │
└─────────────────────────────────────────────────────────────┘
```

**Component:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export const BurndownChart: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
  const { burndownData, isLoading } = useBurndownData(sprint.id)

  if (isLoading) return <ChartLoader />

  // Calculate status
  const currentPoint = burndownData[burndownData.length - 1]
  const isOnTrack = currentPoint.remainingStoryPoints <= currentPoint.idealRemainingPoints
  const requiredVelocity = currentPoint.remainingStoryPoints / sprint.daysRemaining

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Sprint Burndown Chart</h2>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={burndownData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value: number) => [`${value} pts`, '']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="idealRemainingPoints"
            stroke="#9ca3af"
            strokeDasharray="5 5"
            name="Ideal Burndown"
          />
          <Line
            type="monotone"
            dataKey="remainingStoryPoints"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Actual Burndown"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Status Alert */}
      <div className={`mt-4 p-4 rounded-lg ${isOnTrack ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${isOnTrack ? 'text-green-600' : 'text-orange-600'}`}>
            {isOnTrack ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h3 className={`font-semibold ${isOnTrack ? 'text-green-900' : 'text-orange-900'}`}>
              {isOnTrack ? 'Sprint On Track' : 'Sprint At Risk'}
            </h3>
            <ul className={`mt-2 text-sm space-y-1 ${isOnTrack ? 'text-green-700' : 'text-orange-700'}`}>
              <li>• {currentPoint.remainingStoryPoints} story points remaining</li>
              <li>• {sprint.daysRemaining} days remaining</li>
              <li>• Required velocity: {requiredVelocity.toFixed(1)} pts/day</li>
              <li>• Current velocity: {sprint.currentVelocity?.toFixed(1)} pts/day</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 2.6 Sprint Comments Component

**Purpose:** Comment thread for sprint discussions

**File:** `apps/web/src/components/sprint/SprintComments.tsx`

**Pattern:** Similar to story comments but sprint-specific

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Sprint Comments                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │ [IMPEDIMENT] [QUESTION] [DECISION] [ALL]            ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 🚨 IMPEDIMENT                                  2h ago││
│  │ John Doe                                              ││
│  │                                                       ││
│  │ Database server is experiencing downtime. This is    ││
│  │ blocking Story #45 and Story #47.                    ││
│  │                                                       ││
│  │ [Edit] [Delete]                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ❓ QUESTION                                  5h ago  ││
│  │ Jane Smith                                            ││
│  │                                                       ││
│  │ Should we include the mobile view in this sprint or  ││
│  │ defer to next sprint?                                ││
│  │                                                       ││
│  │ [Edit] [Delete]                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Add a comment...                                     ││
│  │ [GENERAL ▼]                                          ││
│  │ [Post Comment]                                       ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Component:**
```tsx
export const SprintComments: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
  const [selectedType, setSelectedType] = useState<CommentType | 'ALL'>('ALL')
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<CommentType>('GENERAL')

  const { comments, isLoading, createComment, updateComment, deleteComment } = useSprintComments(sprint.id)

  const filteredComments = selectedType === 'ALL'
    ? comments
    : comments.filter(c => c.type === selectedType)

  const handlePostComment = async () => {
    if (!newComment.trim()) return

    await createComment({ content: newComment, type: commentType })
    setNewComment('')
    setCommentType('GENERAL')
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <CommentTypeFilter selectedType={selectedType} onSelectType={setSelectedType} />

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onEdit={(id, content, type) => updateComment(id, { content, type })}
            onDelete={(id) => deleteComment(id)}
            currentUserId={currentUser.id}
          />
        ))}

        {filteredComments.length === 0 && (
          <EmptyState message="No comments yet. Be the first to comment!" />
        )}
      </div>

      {/* New Comment Form */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2">
          <Select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value as CommentType)}
            options={[
              { value: 'GENERAL', label: 'General' },
              { value: 'IMPEDIMENT', label: 'Impediment' },
              { value: 'QUESTION', label: 'Question' },
              { value: 'DECISION', label: 'Decision' },
              { value: 'ACTION_ITEM', label: 'Action Item' }
            ]}
          />
          <Button
            onClick={handlePostComment}
            disabled={!newComment.trim()}
            variant="primary"
          >
            Post Comment
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 3. Sprint Form Modals

### 3.1 Create/Edit Sprint Modal

**File:** `apps/web/src/components/sprint/SprintFormModal.tsx`

**Pattern:** Follow TeamFormModal and ProjectFormModal patterns

**Props:**
```typescript
interface SprintFormModalProps {
  sprint?: Sprint  // Undefined for create, defined for edit
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSave: (sprint: Sprint) => void
  isLoading?: boolean
}
```

**Form Fields:**
```tsx
<Modal isOpen={isOpen} onClose={onClose} title={sprint ? 'Edit Sprint' : 'Create Sprint'}>
  <form onSubmit={handleSubmit}>
    <Input
      label="Sprint Name"
      name="name"
      value={formData.name}
      onChange={handleChange}
      required
      placeholder="Sprint 1"
    />

    <Input
      label="Sprint Goal"
      name="goal"
      value={formData.goal}
      onChange={handleChange}
      placeholder="What is the goal of this sprint?"
    />

    <div className="grid grid-cols-2 gap-4">
      <Input
        type="date"
        label="Start Date"
        name="startDate"
        value={formData.startDate}
        onChange={handleChange}
        required
      />

      <Input
        type="date"
        label="End Date"
        name="endDate"
        value={formData.endDate}
        onChange={handleChange}
        required
        min={formData.startDate}
      />
    </div>

    <Input
      type="number"
      label="Capacity (Story Points)"
      name="capacity"
      value={formData.capacity}
      onChange={handleChange}
      placeholder="40"
      min={1}
    />

    <div className="flex justify-end gap-2 mt-6">
      <Button type="button" onClick={onClose} variant="outline">
        Cancel
      </Button>
      <Button type="submit" variant="primary" isLoading={isLoading}>
        {sprint ? 'Update Sprint' : 'Create Sprint'}
      </Button>
    </div>
  </form>
</Modal>
```

**Validation:**
- Name: Required, 1-100 chars
- Start Date: Required, valid date
- End Date: Required, must be after start date
- Capacity: Optional, positive integer

---

### 3.2 Backlog Assignment Modal

**File:** `apps/web/src/components/sprint/BacklogModal.tsx`

**Purpose:** Select stories from backlog to assign to sprint

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Add Stories to Sprint                          [Close] │
├─────────────────────────────────────────────────────────┤
│  Search: [_____________________________________]         │
│  Filter: [All Priorities ▼] [All Types ▼]              │
├─────────────────────────────────────────────────────────┤
│  Available Stories (12)                    Selected (3) │
│                                                          │
│  ☐ Story 1: User Authentication         5 pts          │
│  ☑ Story 2: Dashboard Layout            8 pts          │
│  ☐ Story 3: Settings Page               3 pts          │
│  ☑ Story 4: User Profile                5 pts          │
│  ☐ Story 5: Notification System         13 pts         │
│  ☑ Story 6: Search Feature              8 pts          │
│                                                          │
│  Total Selected: 3 stories, 21 points                   │
├─────────────────────────────────────────────────────────┤
│  [Cancel]                          [Add to Sprint]      │
└─────────────────────────────────────────────────────────┘
```

**Component:**
```tsx
interface BacklogModalProps {
  sprintId: string
  projectId: string
  isOpen: boolean
  onClose: () => void
  onAssignStories: (storyIds: string[]) => Promise<void>
}

export const BacklogModal: React.FC<BacklogModalProps> = ({
  sprintId,
  projectId,
  isOpen,
  onClose,
  onAssignStories
}) => {
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')

  const { stories: backlogStories } = useBacklogStories(projectId)

  const filteredStories = backlogStories
    .filter(s => !s.sprintId) // Only unassigned stories
    .filter(s => priorityFilter === 'ALL' || s.priority === priorityFilter)
    .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const toggleStory = (storyId: string) => {
    const newSet = new Set(selectedStoryIds)
    if (newSet.has(storyId)) {
      newSet.delete(storyId)
    } else {
      newSet.add(storyId)
    }
    setSelectedStoryIds(newSet)
  }

  const selectedStories = filteredStories.filter(s => selectedStoryIds.has(s.id))
  const totalPoints = selectedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  const handleAssign = async () => {
    await onAssignStories(Array.from(selectedStoryIds))
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Stories to Sprint" size="large">
      {/* Search and Filters */}
      <div className="mb-4 space-y-2">
        <Input
          placeholder="Search stories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')}
            options={[
              { value: 'ALL', label: 'All Priorities' },
              { value: 'URGENT', label: 'Urgent' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' }
            ]}
          />
        </div>
      </div>

      {/* Story List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredStories.map(story => (
          <div
            key={story.id}
            className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
              selectedStoryIds.has(story.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => toggleStory(story.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox checked={selectedStoryIds.has(story.id)} onChange={() => {}} />
                <div className="flex-1">
                  <div className="font-medium">{story.title}</div>
                  <div className="text-sm text-gray-600">{story.description}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-700">
                {story.storyPoints || 0} pts
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium">
          Selected: {selectedStoryIds.size} stories, {totalPoints} points
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} variant="outline">Cancel</Button>
        <Button
          onClick={handleAssign}
          variant="primary"
          disabled={selectedStoryIds.size === 0}
        >
          Add to Sprint
        </Button>
      </div>
    </Modal>
  )
}
```

---

## 4. Custom Hooks

### 4.1 useSprintDetail Hook

**File:** `apps/web/src/hooks/useSprintDetail.ts`

```typescript
export function useSprintDetail(sprintId: string) {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    async function loadSprint() {
      try {
        setIsLoading(true)
        const data = await sprintsApi.getById(sprintId)
        setSprint(data)
        setError(null)
      } catch (err) {
        setError(err as ApiError)
      } finally {
        setIsLoading(false)
      }
    }

    loadSprint()
  }, [sprintId])

  return { sprint, isLoading, error, refresh: () => loadSprint() }
}
```

---

### 4.2 useSprintMetrics Hook

**File:** `apps/web/src/hooks/useSprintMetrics.ts`

```typescript
export function useSprintMetrics(sprintId: string) {
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      try {
        setIsLoading(true)
        const data = await sprintsApi.getMetrics(sprintId)
        setMetrics(data)
      } catch (err) {
        console.error('Failed to load sprint metrics:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()

    // Refresh metrics every 30 seconds for active sprints
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [sprintId])

  return { metrics, isLoading }
}
```

---

### 4.3 useBurndownData Hook

**File:** `apps/web/src/hooks/useBurndownData.ts`

```typescript
export function useBurndownData(sprintId: string) {
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadBurndown() {
      try {
        setIsLoading(true)
        const data = await sprintsApi.getBurndownData(sprintId)
        setBurndownData(data)
      } catch (err) {
        console.error('Failed to load burndown data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadBurndown()
  }, [sprintId])

  return { burndownData, isLoading }
}
```

---

## 5. State Management Patterns

### 5.1 Optimistic Updates for Sprint Operations

**Pattern:** Same as Board component

```typescript
const updateSprintStatus = async (sprintId: string, newStatus: SprintStatus) => {
  const previousSprint = sprint

  // Optimistic update
  setSprint({ ...sprint, status: newStatus })

  try {
    const updatedSprint = await sprintsApi.updateStatus(sprintId, newStatus)
    setSprint(updatedSprint)
    toast.showSuccess('Sprint status updated')
  } catch (error) {
    // Rollback
    setSprint(previousSprint)
    toast.showError(error, 'Failed to update sprint status')
  }
}
```

---

### 5.2 Real-time Updates (Optional Enhancement)

For active sprints, implement real-time updates using polling:

```typescript
useEffect(() => {
  if (sprint?.status === 'ACTIVE') {
    const interval = setInterval(async () => {
      try {
        const updated = await sprintsApi.getById(sprint.id)
        setSprint(updated)
      } catch (err) {
        console.error('Failed to refresh sprint:', err)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }
}, [sprint?.status, sprint?.id])
```

---

## 6. Responsive Design Patterns

### Mobile Layout Adaptations

```tsx
// Desktop: 3-column grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {sprints.map(sprint => <SprintCard key={sprint.id} sprint={sprint} />)}
</div>

// Mobile: Stack vertically
<div className="flex flex-col gap-4">
  {sprints.map(sprint => <SprintCard key={sprint.id} sprint={sprint} />)}
</div>
```

---

## 7. Error Handling UI Patterns

### Error Boundary for Sprint Components

```tsx
<ErrorBoundary
  fallback={<SprintErrorFallback />}
  onError={(error) => console.error('Sprint component error:', error)}
>
  <SprintDetail sprintId={sprintId} />
</ErrorBoundary>
```

---

## 8. Loading States

### Skeleton Loaders

```tsx
export const SprintCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
    <div className="h-8 bg-gray-200 rounded mb-4" />
    <div className="flex gap-2">
      <div className="h-9 bg-gray-200 rounded flex-1" />
      <div className="h-9 bg-gray-200 rounded w-20" />
    </div>
  </div>
)
```

---

## 9. Accessibility Patterns

### Keyboard Navigation

```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
  onClick={handleClick}
>
  Sprint Card
</div>
```

### ARIA Labels

```tsx
<button
  aria-label={`Start sprint ${sprint.name}`}
  onClick={() => handleStartSprint(sprint)}
>
  Start Sprint
</button>
```

---

## 10. Summary

### Component File Structure

```
apps/web/src/
├── components/
│   └── sprint/
│       ├── SprintCard.tsx
│       ├── SprintBoard.tsx
│       ├── SprintBoardColumn.tsx
│       ├── SprintMetrics.tsx
│       ├── BurndownChart.tsx
│       ├── SprintComments.tsx
│       ├── CommentCard.tsx
│       ├── SprintFormModal.tsx
│       ├── BacklogModal.tsx
│       ├── SprintStatusBadge.tsx
│       ├── TimeProgressCard.tsx
│       ├── PriorityBreakdownCard.tsx
│       └── __tests__/
│           ├── SprintCard.test.tsx
│           ├── SprintBoard.test.tsx
│           └── BurndownChart.test.tsx
├── hooks/
│   ├── useSprintDetail.ts
│   ├── useSprintMetrics.ts
│   ├── useBurndownData.ts
│   └── useSprintComments.ts
├── lib/
│   └── sprints/
│       └── api.ts
└── app/
    └── teams/[teamId]/projects/[projectId]/sprints/
        ├── page.tsx                    // Sprint list
        └── [sprintId]/
            └── page.tsx                // Sprint detail

```

### Key UI Patterns Applied

1. **Card-Based Design**: Sprint cards with metrics and actions
2. **Tab Navigation**: Organize sprint detail views
3. **Drag & Drop**: Story management within sprint context
4. **Charts & Visualizations**: Burndown charts, progress bars, pie charts
5. **Modal Workflows**: Forms and selection modals
6. **Optimistic Updates**: Immediate feedback with rollback
7. **Real-time Polling**: Auto-refresh for active sprints
8. **Responsive Layout**: Mobile-first design
9. **Accessibility**: ARIA labels, keyboard navigation
10. **Loading States**: Skeleton loaders, operation tracking

All patterns follow established conventions from the existing codebase for consistency and maintainability.

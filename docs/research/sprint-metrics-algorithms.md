# Sprint Metrics and Calculation Algorithms

## Overview
Mathematical algorithms and calculation strategies for sprint metrics, velocity tracking, burndown charts, and progress indicators.

---

## 1. Core Sprint Metrics

### 1.1 Story Completion Metrics

#### Total Story Count
```typescript
function calculateStoryCount(stories: Story[]): StoryCountMetrics {
  return {
    total: stories.length,
    completed: stories.filter(s => s.status === 'DONE').length,
    inProgress: stories.filter(s => s.status === 'IN_PROGRESS').length,
    todo: stories.filter(s => s.status === 'TODO').length,
    blocked: stories.filter(s => s.status === 'BLOCKED').length
  }
}
```

**Usage:**
- Sprint progress tracking
- Team capacity planning
- Impediment identification (blocked stories)

---

#### Story Point Metrics
```typescript
function calculateStoryPointMetrics(stories: Story[]): StoryPointMetrics {
  const totalStoryPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  const completedStoryPoints = stories
    .filter(s => s.status === 'DONE')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  const inProgressStoryPoints = stories
    .filter(s => s.status === 'IN_PROGRESS')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  const remainingStoryPoints = totalStoryPoints - completedStoryPoints

  return {
    totalStoryPoints,
    completedStoryPoints,
    inProgressStoryPoints,
    remainingStoryPoints,
    completionPercentage: totalStoryPoints > 0
      ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
      : 0
  }
}
```

**Key Calculations:**
- **Total Points**: Sum of all story points in sprint
- **Completed Points**: Sum of DONE stories only
- **Remaining Points**: Total - Completed
- **Completion %**: (Completed / Total) × 100

---

### 1.2 Velocity Calculations

#### Sprint Velocity
**Definition:** Total story points completed during a sprint.

```typescript
function calculateSprintVelocity(sprint: Sprint, stories: Story[]): number | null {
  // Only calculate velocity for COMPLETED sprints
  if (sprint.status !== 'COMPLETED') {
    return null
  }

  const completedStoryPoints = stories
    .filter(s => s.status === 'DONE')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  return completedStoryPoints
}
```

**When Calculated:**
- Automatically when sprint status changes to COMPLETED
- Stored in `sprint.velocity` field

**Usage:**
- Historical velocity tracking
- Future sprint capacity planning
- Team performance metrics

---

#### Daily Velocity (Current Rate)
**Definition:** Average story points completed per day in current sprint.

```typescript
function calculateDailyVelocity(sprint: Sprint, stories: Story[]): number {
  const completedStoryPoints = stories
    .filter(s => s.status === 'DONE')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  const daysElapsed = calculateDaysElapsed(sprint.startDate, new Date())

  // Avoid division by zero
  if (daysElapsed === 0) {
    return 0
  }

  return parseFloat((completedStoryPoints / daysElapsed).toFixed(2))
}
```

**Usage:**
- Real-time sprint progress monitoring
- Burndown chart velocity trend line
- Early warning system for at-risk sprints

---

#### Required Velocity
**Definition:** Story points per day needed to complete remaining work.

```typescript
function calculateRequiredVelocity(
  remainingStoryPoints: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) {
    return 0
  }

  return parseFloat((remainingStoryPoints / daysRemaining).toFixed(2))
}
```

**Usage:**
- Sprint health indicator
- Compare with current velocity to assess risk
- Guide daily standup discussions

**Interpretation:**
- Required > Current: Sprint at risk, needs action
- Required ≈ Current: Sprint on track
- Required < Current: Sprint ahead of schedule

---

#### Team Average Velocity
**Definition:** Average velocity across last N completed sprints.

```typescript
function calculateTeamAverageVelocity(
  completedSprints: Sprint[],
  lookbackCount: number = 3
): number {
  // Get last N completed sprints with velocity
  const recentSprints = completedSprints
    .filter(s => s.velocity !== null)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    .slice(0, lookbackCount)

  if (recentSprints.length === 0) {
    return 0
  }

  const totalVelocity = recentSprints.reduce((sum, s) => sum + (s.velocity || 0), 0)
  return Math.round(totalVelocity / recentSprints.length)
}
```

**Parameters:**
- `lookbackCount`: Number of sprints to average (default: 3)

**Usage:**
- Sprint capacity planning
- Setting realistic sprint goals
- Team performance trending

---

### 1.3 Time-Based Metrics

#### Days Calculations
```typescript
function calculateDaysMetrics(startDate: Date, endDate: Date): DaysMetrics {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Total sprint duration
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Days elapsed (capped at total days)
  const daysElapsed = Math.min(
    Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    totalDays
  )

  // Days remaining (minimum 0)
  const daysRemaining = Math.max(totalDays - daysElapsed, 0)

  // Time progress percentage
  const timeProgressPercentage = totalDays > 0
    ? Math.round((daysElapsed / totalDays) * 100)
    : 0

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    timeProgressPercentage
  }
}
```

**Edge Cases:**
- Sprint not started: daysElapsed = 0
- Sprint ended: daysRemaining = 0, daysElapsed = totalDays
- Same day sprint: totalDays = 1

---

### 1.4 Sprint Health Score

#### Composite Health Metric
```typescript
interface SprintHealth {
  score: number          // 0-100
  status: 'healthy' | 'at-risk' | 'critical'
  factors: HealthFactor[]
}

interface HealthFactor {
  name: string
  score: number
  weight: number
  description: string
}

function calculateSprintHealth(sprint: Sprint, metrics: SprintMetrics): SprintHealth {
  const factors: HealthFactor[] = []

  // Factor 1: Velocity alignment (30% weight)
  const velocityScore = calculateVelocityScore(
    metrics.currentVelocity,
    metrics.requiredVelocity
  )
  factors.push({
    name: 'Velocity Alignment',
    score: velocityScore,
    weight: 0.3,
    description: 'Current velocity vs required velocity'
  })

  // Factor 2: Time vs work remaining (30% weight)
  const progressScore = calculateProgressScore(
    metrics.completionPercentage,
    metrics.timeProgressPercentage
  )
  factors.push({
    name: 'Progress Balance',
    score: progressScore,
    weight: 0.3,
    description: 'Work completed vs time elapsed'
  })

  // Factor 3: Blocked stories (20% weight)
  const blockedScore = calculateBlockedScore(
    metrics.blockedStories,
    metrics.totalStories
  )
  factors.push({
    name: 'Impediment Impact',
    score: blockedScore,
    weight: 0.2,
    description: 'Impact of blocked stories'
  })

  // Factor 4: Capacity utilization (20% weight)
  const capacityScore = calculateCapacityScore(
    metrics.totalStoryPoints,
    sprint.capacity || 0
  )
  factors.push({
    name: 'Capacity Planning',
    score: capacityScore,
    weight: 0.2,
    description: 'Sprint load vs team capacity'
  })

  // Calculate weighted average
  const totalScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0)

  // Determine status
  let status: 'healthy' | 'at-risk' | 'critical'
  if (totalScore >= 70) {
    status = 'healthy'
  } else if (totalScore >= 50) {
    status = 'at-risk'
  } else {
    status = 'critical'
  }

  return {
    score: Math.round(totalScore),
    status,
    factors
  }
}

// Helper functions for individual factor scores
function calculateVelocityScore(current: number, required: number): number {
  if (required === 0) return 100
  const ratio = current / required
  if (ratio >= 1.0) return 100
  if (ratio >= 0.9) return 80
  if (ratio >= 0.7) return 60
  if (ratio >= 0.5) return 40
  return 20
}

function calculateProgressScore(workProgress: number, timeProgress: number): number {
  const delta = workProgress - timeProgress
  if (delta >= 10) return 100  // Ahead of schedule
  if (delta >= 0) return 80    // On track
  if (delta >= -10) return 60  // Slightly behind
  if (delta >= -20) return 40  // Behind
  return 20                     // Significantly behind
}

function calculateBlockedScore(blockedCount: number, totalCount: number): number {
  if (totalCount === 0) return 100
  const blockedPercentage = (blockedCount / totalCount) * 100
  if (blockedPercentage === 0) return 100
  if (blockedPercentage <= 10) return 80
  if (blockedPercentage <= 20) return 60
  if (blockedPercentage <= 30) return 40
  return 20
}

function calculateCapacityScore(planned: number, capacity: number): number {
  if (capacity === 0) return 100
  const utilization = (planned / capacity) * 100
  // Sweet spot: 80-100% capacity
  if (utilization >= 80 && utilization <= 100) return 100
  if (utilization >= 70 && utilization < 80) return 80
  if (utilization > 100 && utilization <= 120) return 70  // Slightly over
  if (utilization < 70) return 60  // Under-planned
  return 40  // Significantly over-committed
}
```

**Usage:**
- Sprint dashboard health indicator
- Daily standup discussion point
- Risk identification and mitigation

---

## 2. Burndown Chart Calculations

### 2.1 Ideal Burndown Line

**Definition:** Linear decrease from initial capacity to zero over sprint duration.

```typescript
function calculateIdealBurndown(
  startDate: Date,
  endDate: Date,
  initialCapacity: number
): BurndownPoint[] {
  const points: BurndownPoint[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Calculate total days
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate daily burn rate
  const dailyBurnRate = initialCapacity / totalDays

  // Generate point for each day
  for (let day = 0; day <= totalDays; day++) {
    const date = new Date(start)
    date.setDate(date.getDate() + day)

    points.push({
      date: date.toISOString(),
      idealRemainingPoints: Math.max(initialCapacity - (dailyBurnRate * day), 0),
      remainingStoryPoints: 0,  // Filled in separately
      completedStoryPoints: 0   // Filled in separately
    })
  }

  return points
}
```

**Properties:**
- Starts at sprint capacity
- Ends at 0 on final day
- Linear decrease (straight line)

---

### 2.2 Actual Burndown Data

**Definition:** Actual remaining story points at end of each day.

```typescript
interface StoryStatusHistory {
  storyId: string
  status: StoryStatus
  storyPoints: number
  updatedAt: Date
}

function calculateActualBurndown(
  sprint: Sprint,
  stories: Story[],
  statusHistory: StoryStatusHistory[]
): BurndownPoint[] {
  const points: BurndownPoint[] = []
  const start = new Date(sprint.startDate)
  const end = new Date(sprint.endDate)
  const now = new Date()

  // Calculate total days (up to current date)
  const endDate = sprint.status === 'COMPLETED' ? end : (now < end ? now : end)
  const totalDays = Math.ceil((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Initial total story points
  const initialStoryPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  // Generate point for each day
  for (let day = 0; day <= totalDays; day++) {
    const date = new Date(start)
    date.setDate(date.getDate() + day)
    date.setHours(23, 59, 59, 999) // End of day

    // Calculate completed story points up to this date
    const completedByDate = statusHistory
      .filter(h => h.status === 'DONE' && new Date(h.updatedAt) <= date)
      .reduce((sum, h) => sum + h.storyPoints, 0)

    // Calculate remaining story points
    const remainingStoryPoints = initialStoryPoints - completedByDate

    points.push({
      date: date.toISOString(),
      remainingStoryPoints,
      completedStoryPoints: completedByDate,
      idealRemainingPoints: 0  // Filled in separately
    })
  }

  return points
}
```

**Data Requirements:**
- Story status change history (audit trail)
- Story point values at time of completion
- Timestamp for each status change

**Alternative Approach (Simpler):**
If detailed history is not available, use current state as proxy:

```typescript
function calculateSimpleBurndown(
  sprint: Sprint,
  stories: Story[]
): BurndownPoint[] {
  const points: BurndownPoint[] = []
  const start = new Date(sprint.startDate)
  const end = new Date(sprint.endDate)
  const now = new Date()

  const endDate = sprint.status === 'COMPLETED' ? end : (now < end ? now : end)
  const totalDays = Math.ceil((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const initialStoryPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  const completedStoryPoints = stories
    .filter(s => s.status === 'DONE')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  // Assume linear completion (for simplification)
  const dailyCompletionRate = completedStoryPoints / totalDays

  for (let day = 0; day <= totalDays; day++) {
    const date = new Date(start)
    date.setDate(date.getDate() + day)

    const completedByDay = Math.min(dailyCompletionRate * day, completedStoryPoints)
    const remainingByDay = initialStoryPoints - completedByDay

    points.push({
      date: date.toISOString(),
      remainingStoryPoints: remainingByDay,
      completedStoryPoints: completedByDay,
      idealRemainingPoints: 0
    })
  }

  return points
}
```

---

### 2.3 Velocity Trend Line

**Definition:** Moving average of completion rate to smooth out daily variations.

```typescript
function calculateVelocityTrend(
  burndownData: BurndownPoint[],
  windowSize: number = 3
): BurndownPoint[] {
  return burndownData.map((point, index) => {
    if (index < windowSize - 1) {
      // Not enough data for moving average yet
      return { ...point, velocityTrend: 0 }
    }

    // Calculate average completion over window
    const windowData = burndownData.slice(index - windowSize + 1, index + 1)
    const totalCompleted = windowData[windowData.length - 1].completedStoryPoints -
                           windowData[0].completedStoryPoints
    const averageDailyCompletion = totalCompleted / windowSize

    return {
      ...point,
      velocityTrend: parseFloat(averageDailyCompletion.toFixed(2))
    }
  })
}
```

**Parameters:**
- `windowSize`: Number of days for moving average (default: 3)

**Usage:**
- Smooth out day-to-day variations
- Show overall completion trend
- More accurate velocity projection

---

### 2.4 Combined Burndown Data

**Putting it all together:**

```typescript
function generateCompleteBurndownData(
  sprint: Sprint,
  stories: Story[],
  statusHistory: StoryStatusHistory[]
): BurndownPoint[] {
  // Calculate initial capacity
  const initialCapacity = sprint.capacity ||
    stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

  // Generate ideal line
  const idealLine = calculateIdealBurndown(
    sprint.startDate,
    sprint.endDate,
    initialCapacity
  )

  // Generate actual line
  const actualLine = calculateActualBurndown(sprint, stories, statusHistory)

  // Merge ideal and actual data
  const mergedData = idealLine.map((idealPoint, index) => {
    const actualPoint = actualLine[index] || actualLine[actualLine.length - 1]

    return {
      date: idealPoint.date,
      idealRemainingPoints: Math.round(idealPoint.idealRemainingPoints),
      remainingStoryPoints: Math.round(actualPoint?.remainingStoryPoints || initialCapacity),
      completedStoryPoints: Math.round(actualPoint?.completedStoryPoints || 0)
    }
  })

  // Add velocity trend
  return calculateVelocityTrend(mergedData)
}
```

---

## 3. Progress Calculations

### 3.1 Completion Percentage

```typescript
function calculateCompletionPercentage(
  completedPoints: number,
  totalPoints: number
): number {
  if (totalPoints === 0) return 0
  return Math.min(Math.round((completedPoints / totalPoints) * 100), 100)
}
```

**Variations:**

**Story Count Based:**
```typescript
function calculateStoryCompletionPercentage(
  completedStories: number,
  totalStories: number
): number {
  if (totalStories === 0) return 0
  return Math.min(Math.round((completedStories / totalStories) * 100), 100)
}
```

**Use Cases:**
- Story Point Based: Primary metric for sprint progress
- Story Count Based: Secondary metric, useful when story points vary widely

---

### 3.2 Time Progress Percentage

```typescript
function calculateTimeProgressPercentage(
  startDate: Date,
  endDate: Date,
  currentDate: Date = new Date()
): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const current = new Date(currentDate).getTime()

  // Before sprint starts
  if (current < start) return 0

  // After sprint ends
  if (current > end) return 100

  const totalDuration = end - start
  const elapsedDuration = current - start

  return Math.min(Math.round((elapsedDuration / totalDuration) * 100), 100)
}
```

---

### 3.3 Sprint Forecast

**Definition:** Predicted final velocity based on current trend.

```typescript
interface SprintForecast {
  projectedVelocity: number
  projectedCompletionPercentage: number
  projectedRemainingPoints: number
  likelihood: 'high' | 'medium' | 'low'
  recommendation: string
}

function forecastSprintCompletion(
  sprint: Sprint,
  metrics: SprintMetrics
): SprintForecast {
  const { daysRemaining, currentVelocity, remainingStoryPoints, totalStoryPoints } = metrics

  // Projected completion based on current velocity
  const projectedCompletedPoints = metrics.completedStoryPoints +
    (currentVelocity * daysRemaining)

  const projectedVelocity = projectedCompletedPoints
  const projectedCompletionPercentage = Math.min(
    Math.round((projectedCompletedPoints / totalStoryPoints) * 100),
    100
  )
  const projectedRemainingPoints = Math.max(
    totalStoryPoints - projectedCompletedPoints,
    0
  )

  // Determine likelihood
  let likelihood: 'high' | 'medium' | 'low'
  let recommendation: string

  if (projectedCompletionPercentage >= 100) {
    likelihood = 'high'
    recommendation = 'Sprint is on track to complete all stories. Maintain current pace.'
  } else if (projectedCompletionPercentage >= 80) {
    likelihood = 'medium'
    recommendation = `Sprint may complete ${projectedCompletionPercentage}% of stories. Consider de-scoping ${projectedRemainingPoints} points.`
  } else {
    likelihood = 'low'
    recommendation = `Sprint is at risk. Only ${projectedCompletionPercentage}% projected. Immediate action required.`
  }

  return {
    projectedVelocity,
    projectedCompletionPercentage,
    projectedRemainingPoints,
    likelihood,
    recommendation
  }
}
```

**Usage:**
- Daily standup discussions
- Mid-sprint adjustments
- Stakeholder communication

---

## 4. Priority and Type Breakdowns

### 4.1 Stories by Priority

```typescript
interface PriorityBreakdown {
  priority: Priority
  storyCount: number
  storyPoints: number
  completedCount: number
  completedPoints: number
  completionPercentage: number
}

function calculatePriorityBreakdown(stories: Story[]): PriorityBreakdown[] {
  const priorities: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

  return priorities.map(priority => {
    const storiesInPriority = stories.filter(s => s.priority === priority)
    const storyCount = storiesInPriority.length
    const storyPoints = storiesInPriority.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    const completedStories = storiesInPriority.filter(s => s.status === 'DONE')
    const completedCount = completedStories.length
    const completedPoints = completedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    const completionPercentage = storyPoints > 0
      ? Math.round((completedPoints / storyPoints) * 100)
      : 0

    return {
      priority,
      storyCount,
      storyPoints,
      completedCount,
      completedPoints,
      completionPercentage
    }
  }).filter(breakdown => breakdown.storyCount > 0)  // Only include priorities with stories
}
```

**Usage:**
- Identify which priorities are being completed
- Ensure high-priority work is progressing
- Balance priority distribution

---

### 4.2 Stories by Type

```typescript
interface TypeBreakdown {
  type: StoryType
  storyCount: number
  storyPoints: number
  completionPercentage: number
}

function calculateTypeBreakdown(stories: Story[]): TypeBreakdown[] {
  const types: StoryType[] = ['FEATURE', 'BUG', 'ENHANCEMENT', 'SPIKE', 'EPIC']

  return types.map(type => {
    const storiesOfType = stories.filter(s => s.type === type)
    const storyCount = storiesOfType.length
    const storyPoints = storiesOfType.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    const completedStories = storiesOfType.filter(s => s.status === 'DONE')
    const completedPoints = completedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)

    const completionPercentage = storyPoints > 0
      ? Math.round((completedPoints / storyPoints) * 100)
      : 0

    return {
      type,
      storyCount,
      storyPoints,
      completionPercentage
    }
  }).filter(breakdown => breakdown.storyCount > 0)
}
```

**Usage:**
- Understand sprint composition (features vs bugs)
- Track technical debt (spikes, enhancements)
- Balance work types

---

## 5. Advanced Metrics

### 5.1 Story Cycle Time

**Definition:** Average time from TODO to DONE for completed stories.

```typescript
interface StoryCycleTime {
  averageCycleTimeDays: number
  medianCycleTimeDays: number
  minCycleTimeDays: number
  maxCycleTimeDays: number
}

function calculateStoryCycleTime(
  stories: Story[],
  statusHistory: StoryStatusHistory[]
): StoryCycleTime {
  const completedStories = stories.filter(s => s.status === 'DONE')
  const cycleTimes: number[] = []

  for (const story of completedStories) {
    // Find first status change to IN_PROGRESS or DONE
    const startEvent = statusHistory
      .filter(h => h.storyId === story.id && h.status !== 'TODO')
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())[0]

    // Find status change to DONE
    const doneEvent = statusHistory
      .filter(h => h.storyId === story.id && h.status === 'DONE')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    if (startEvent && doneEvent) {
      const startTime = new Date(startEvent.updatedAt).getTime()
      const doneTime = new Date(doneEvent.updatedAt).getTime()
      const cycleTimeDays = (doneTime - startTime) / (1000 * 60 * 60 * 24)
      cycleTimes.push(cycleTimeDays)
    }
  }

  if (cycleTimes.length === 0) {
    return {
      averageCycleTimeDays: 0,
      medianCycleTimeDays: 0,
      minCycleTimeDays: 0,
      maxCycleTimeDays: 0
    }
  }

  const sortedTimes = cycleTimes.sort((a, b) => a - b)
  const average = cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)]

  return {
    averageCycleTimeDays: parseFloat(average.toFixed(2)),
    medianCycleTimeDays: parseFloat(median.toFixed(2)),
    minCycleTimeDays: parseFloat(sortedTimes[0].toFixed(2)),
    maxCycleTimeDays: parseFloat(sortedTimes[sortedTimes.length - 1].toFixed(2))
  }
}
```

**Usage:**
- Identify bottlenecks in development process
- Compare cycle times across story sizes
- Improve estimation accuracy

---

### 5.2 Throughput

**Definition:** Number of stories completed per day.

```typescript
function calculateThroughput(
  completedStories: number,
  daysElapsed: number
): number {
  if (daysElapsed === 0) return 0
  return parseFloat((completedStories / daysElapsed).toFixed(2))
}
```

**Usage:**
- Alternative to velocity (count-based)
- Useful when story points are inconsistent
- Simplifies capacity planning

---

### 5.3 Work in Progress (WIP) Limits

**Definition:** Number of stories currently in progress.

```typescript
interface WIPMetrics {
  currentWIP: number
  recommendedWIP: number
  wipUtilization: number
  isOverLimit: boolean
}

function calculateWIPMetrics(
  stories: Story[],
  teamSize: number
): WIPMetrics {
  const currentWIP = stories.filter(s => s.status === 'IN_PROGRESS').length

  // Rule of thumb: 1-2 stories per team member
  const recommendedWIP = teamSize * 1.5

  const wipUtilization = recommendedWIP > 0
    ? Math.round((currentWIP / recommendedWIP) * 100)
    : 0

  const isOverLimit = currentWIP > recommendedWIP

  return {
    currentWIP,
    recommendedWIP: Math.ceil(recommendedWIP),
    wipUtilization,
    isOverLimit
  }
}
```

**Usage:**
- Prevent context switching
- Improve focus and completion rate
- Identify team capacity constraints

---

## 6. Implementation Guidelines

### 6.1 Service Layer Implementation

**File:** `apps/api/src/sprints/services/sprint-metrics.service.ts`

```typescript
@Injectable()
export class SprintMetricsService {
  constructor(private prisma: PrismaService) {}

  async calculateMetrics(sprintId: string): Promise<SprintMetrics> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        stories: true
      }
    })

    if (!sprint) {
      throw new NotFoundException('Sprint not found')
    }

    // Calculate story count metrics
    const storyMetrics = this.calculateStoryCount(sprint.stories)

    // Calculate story point metrics
    const pointMetrics = this.calculateStoryPointMetrics(sprint.stories)

    // Calculate time metrics
    const timeMetrics = this.calculateDaysMetrics(sprint.startDate, sprint.endDate)

    // Calculate velocity metrics
    const velocityMetrics = this.calculateVelocityMetrics(
      sprint,
      sprint.stories,
      timeMetrics
    )

    // Calculate health score
    const healthScore = this.calculateSprintHealth(sprint, {
      ...storyMetrics,
      ...pointMetrics,
      ...timeMetrics,
      ...velocityMetrics
    })

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      ...storyMetrics,
      ...pointMetrics,
      ...timeMetrics,
      ...velocityMetrics,
      healthScore
    }
  }

  // Implement all calculation methods here...
}
```

---

### 6.2 Caching Strategy

For performance optimization:

```typescript
@Injectable()
export class SprintMetricsService {
  constructor(
    private prisma: PrismaService,
    private cacheManager: Cache
  ) {}

  async getMetrics(sprintId: string): Promise<SprintMetrics> {
    // Check cache first
    const cacheKey = `sprint:${sprintId}:metrics`
    const cached = await this.cacheManager.get<SprintMetrics>(cacheKey)

    if (cached) {
      return cached
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(sprintId)

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, metrics, 300)

    return metrics
  }

  // Invalidate cache on sprint or story updates
  async invalidateCache(sprintId: string): Promise<void> {
    await this.cacheManager.del(`sprint:${sprintId}:metrics`)
  }
}
```

---

## 7. Summary

### Key Algorithms Implemented

1. **Velocity Tracking**
   - Sprint velocity (completed sprints)
   - Daily velocity (current rate)
   - Required velocity (forecast)
   - Team average velocity (historical)

2. **Burndown Charts**
   - Ideal burndown line (linear)
   - Actual burndown (daily snapshots)
   - Velocity trend line (moving average)

3. **Progress Metrics**
   - Completion percentage (story points & count)
   - Time progress percentage
   - Sprint forecast

4. **Health Indicators**
   - Sprint health score (composite metric)
   - Velocity alignment
   - Progress balance
   - Impediment impact

5. **Advanced Metrics**
   - Story cycle time
   - Throughput
   - WIP limits

### Performance Considerations

- **Database Optimization**: Use proper indexes on sprint, story, and status change tables
- **Caching**: Cache calculated metrics with TTL
- **Incremental Updates**: Only recalculate when data changes
- **Batch Processing**: Calculate metrics for multiple sprints in parallel

### Testing Strategy

- Unit tests for all calculation functions
- Edge case tests (zero stories, zero duration, etc.)
- Performance tests for large datasets
- Integration tests with real database data

All algorithms follow functional programming principles for testability and maintainability.

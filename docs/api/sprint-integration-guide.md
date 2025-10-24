# Sprint API Integration Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication Setup](#authentication-setup)
3. [Common Workflows](#common-workflows)
4. [Code Examples](#code-examples)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Testing & Debugging](#testing--debugging)
8. [Production Considerations](#production-considerations)

---

## Getting Started

### Prerequisites

- API base URL (e.g., `https://api.example.com/api`)
- Valid JWT authentication token
- HTTP client library (fetch, axios, etc.)

### Quick Start

```typescript
// 1. Set up your API client
const API_BASE_URL = 'https://api.example.com/api';
const authToken = 'your-jwt-token';

// 2. Make your first request
const response = await fetch(`${API_BASE_URL}/sprints`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});

const sprints = await response.json();
console.log('Available sprints:', sprints);
```

---

## Authentication Setup

### Obtaining JWT Token

Before using the Sprint API, you need to authenticate and obtain a JWT token:

```typescript
async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { access_token } = await response.json();
  return access_token;
}

// Usage
const token = await login('user@example.com', 'password123');
```

### Creating an API Client

```typescript
class SprintAPIClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(response.status, error.message);
    }

    return response.json();
  }

  // Sprint methods
  async listSprints(projectId?: string, status?: string) {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (status) params.append('status', status);

    const query = params.toString();
    return this.request<Sprint[]>(`/sprints${query ? '?' + query : ''}`);
  }

  async createSprint(data: CreateSprintDto) {
    return this.request<Sprint>('/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSprint(id: string) {
    return this.request<Sprint>(`/sprints/${id}`);
  }

  async updateSprint(id: string, data: UpdateSprintDto) {
    return this.request<Sprint>(`/sprints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSprint(id: string) {
    return this.request<Sprint>(`/sprints/${id}`, {
      method: 'DELETE',
    });
  }

  async startSprint(id: string) {
    return this.request<Sprint>(`/sprints/${id}/start`, {
      method: 'POST',
    });
  }

  async completeSprint(id: string) {
    return this.request<Sprint>(`/sprints/${id}/complete`, {
      method: 'POST',
    });
  }

  async addStories(sprintId: string, storyIds: string[]) {
    return this.request<Sprint>(`/sprints/${sprintId}/stories`, {
      method: 'POST',
      body: JSON.stringify({ storyIds }),
    });
  }

  async removeStory(sprintId: string, storyId: string) {
    return this.request<Sprint>(`/sprints/${sprintId}/stories/${storyId}`, {
      method: 'DELETE',
    });
  }

  async getMetrics(sprintId: string) {
    return this.request<SprintMetrics>(`/sprints/${sprintId}/metrics`);
  }

  async addComment(sprintId: string, content: string, type?: string) {
    return this.request<SprintComment>(`/sprints/${sprintId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async getComments(sprintId: string) {
    return this.request<SprintComment[]>(`/sprints/${sprintId}/comments`);
  }
}

// Custom error class
class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

// Usage
const client = new SprintAPIClient(API_BASE_URL, authToken);
```

---

## Common Workflows

### Workflow 1: Complete Sprint Lifecycle

```typescript
async function completeSprintLifecycle(
  client: SprintAPIClient,
  projectId: string
) {
  try {
    // 1. Create sprint
    console.log('Creating sprint...');
    const sprint = await client.createSprint({
      name: 'Sprint 1',
      goal: 'Implement user authentication',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-14T23:59:59.999Z',
      capacity: 40,
      projectId: projectId,
    });
    console.log('Sprint created:', sprint.id);

    // 2. Add stories to sprint
    console.log('Adding stories...');
    const storyIds = ['story-1', 'story-2', 'story-3'];
    await client.addStories(sprint.id, storyIds);
    console.log('Stories added');

    // 3. Start sprint
    console.log('Starting sprint...');
    const activeSprint = await client.startSprint(sprint.id);
    console.log('Sprint started:', activeSprint.status);

    // 4. Monitor progress (daily)
    console.log('Monitoring progress...');
    const metrics = await client.getMetrics(sprint.id);
    console.log('Completion:', metrics.completionPercentage + '%');
    console.log('Velocity:', metrics.velocity);

    // 5. Add daily standup comment
    await client.addComment(
      sprint.id,
      'Daily standup: Team completed 2 stories today',
      'GENERAL'
    );

    // 6. Complete sprint
    console.log('Completing sprint...');
    const completedSprint = await client.completeSprint(sprint.id);
    console.log('Sprint completed with velocity:', completedSprint.velocity);

    return completedSprint;
  } catch (error) {
    if (error instanceof APIError) {
      console.error(`API Error ${error.statusCode}:`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

### Workflow 2: Sprint Planning Session

```typescript
async function sprintPlanning(
  client: SprintAPIClient,
  projectId: string,
  teamCapacity: number,
  backlogStoryIds: string[]
) {
  // 1. Check for active sprints
  const activeSprints = await client.listSprints(projectId, 'ACTIVE');
  if (activeSprints.length > 0) {
    console.error('Cannot plan: Active sprint exists');
    return null;
  }

  // 2. Calculate sprint dates (2-week sprint)
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  endDate.setHours(23, 59, 59, 999);

  // 3. Create sprint
  const sprint = await client.createSprint({
    name: `Sprint ${Date.now()}`,
    goal: 'To be defined in planning',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    capacity: teamCapacity,
    projectId: projectId,
  });

  // 4. Add selected stories
  await client.addStories(sprint.id, backlogStoryIds);

  // 5. Get metrics to verify capacity
  const metrics = await client.getMetrics(sprint.id);
  if (metrics.totalStoryPoints > teamCapacity) {
    console.warn(
      `Warning: Story points (${metrics.totalStoryPoints}) exceed capacity (${teamCapacity})`
    );
  }

  // 6. Update sprint goal after team discussion
  await client.updateSprint(sprint.id, {
    goal: 'Implement authentication and user profile features',
  });

  return sprint;
}
```

### Workflow 3: Daily Sprint Monitoring

```typescript
async function dailySprintMonitoring(
  client: SprintAPIClient,
  sprintId: string
) {
  // 1. Get current metrics
  const metrics = await client.getMetrics(sprintId);

  // 2. Calculate daily progress
  const sprint = await client.getSprint(sprintId);
  const daysElapsed = Math.floor(
    (Date.now() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalDays = Math.ceil(
    (new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const daysRemaining = totalDays - daysElapsed;

  // 3. Check if sprint is on track
  const expectedCompletion = (daysElapsed / totalDays) * 100;
  const isOnTrack = metrics.completionPercentage >= expectedCompletion - 10;

  // 4. Identify blockers
  const blockedStories = metrics.storiesCount.blocked;

  // 5. Generate daily report
  const report = {
    date: new Date().toISOString().split('T')[0],
    daysRemaining,
    completionPercentage: metrics.completionPercentage,
    expectedCompletion,
    isOnTrack,
    blockedStories,
    storiesCompleted: metrics.storiesCount.done,
    storiesInProgress: metrics.storiesCount.inProgress,
    remainingPoints: metrics.remainingStoryPoints,
  };

  // 6. Add comment if issues detected
  if (blockedStories > 0) {
    await client.addComment(
      sprintId,
      `Alert: ${blockedStories} blocked stories need attention`,
      'IMPEDIMENT'
    );
  }

  if (!isOnTrack) {
    await client.addComment(
      sprintId,
      `Sprint velocity lower than expected. Current: ${metrics.completionPercentage.toFixed(1)}%, Expected: ${expectedCompletion.toFixed(1)}%`,
      'GENERAL'
    );
  }

  return report;
}
```

### Workflow 4: Sprint Retrospective

```typescript
async function sprintRetrospective(
  client: SprintAPIClient,
  sprintId: string
) {
  // 1. Get completed sprint data
  const sprint = await client.getSprint(sprintId);
  if (sprint.status !== 'COMPLETED') {
    throw new Error('Sprint must be completed for retrospective');
  }

  // 2. Get final metrics
  const metrics = await client.getMetrics(sprintId);

  // 3. Get all comments for review
  const comments = await client.getComments(sprintId);
  const impediments = comments.filter(c => c.type === 'IMPEDIMENT');
  const decisions = comments.filter(c => c.type === 'DECISION');

  // 4. Calculate success metrics
  const velocityAchievement = sprint.capacity
    ? (sprint.velocity! / sprint.capacity) * 100
    : 0;

  const retrospectiveData = {
    sprintName: sprint.name,
    goal: sprint.goal,
    plannedCapacity: sprint.capacity,
    actualVelocity: sprint.velocity,
    velocityAchievement: `${velocityAchievement.toFixed(1)}%`,
    completedStories: metrics.storiesCount.done,
    totalStories: metrics.storiesCount.total,
    impedimentsEncountered: impediments.length,
    decisionsDocumented: decisions.length,
    recommendations: generateRecommendations(metrics, sprint),
  };

  // 5. Add retrospective summary as comment
  await client.addComment(
    sprintId,
    `Retrospective Summary:
- Velocity Achievement: ${retrospectiveData.velocityAchievement}
- Completed: ${retrospectiveData.completedStories}/${retrospectiveData.totalStories} stories
- Impediments: ${retrospectiveData.impedimentsEncountered}
- Key Decisions: ${retrospectiveData.decisionsDocumented}`,
    'GENERAL'
  );

  return retrospectiveData;
}

function generateRecommendations(
  metrics: SprintMetrics,
  sprint: Sprint
): string[] {
  const recommendations: string[] = [];

  // Velocity recommendations
  if (sprint.velocity && sprint.capacity) {
    const achievement = (sprint.velocity / sprint.capacity) * 100;
    if (achievement < 70) {
      recommendations.push('Consider reducing capacity or story complexity');
    } else if (achievement > 120) {
      recommendations.push('Team capacity may be underestimated');
    }
  }

  // Blocked stories
  if (metrics.storiesCount.blocked > 0) {
    recommendations.push(
      'Implement earlier impediment identification process'
    );
  }

  // Completion rate
  const completionRate =
    (metrics.storiesCount.done / metrics.storiesCount.total) * 100;
  if (completionRate < 80) {
    recommendations.push('Review story estimation accuracy');
  }

  return recommendations;
}
```

### Workflow 5: Multi-Sprint Project Planning

```typescript
async function planMultipleSprints(
  client: SprintAPIClient,
  projectId: string,
  numberOfSprints: number,
  sprintDurationWeeks: number = 2
) {
  const sprints: Sprint[] = [];
  let currentStartDate = new Date();
  currentStartDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < numberOfSprints; i++) {
    const startDate = new Date(currentStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + sprintDurationWeeks * 7);
    endDate.setHours(23, 59, 59, 999);

    const sprint = await client.createSprint({
      name: `Sprint ${i + 1}`,
      goal: `Sprint ${i + 1} objectives`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      capacity: 40,
      projectId: projectId,
    });

    sprints.push(sprint);

    // Next sprint starts after current one ends
    currentStartDate = new Date(endDate);
    currentStartDate.setDate(currentStartDate.getDate() + 1);
    currentStartDate.setHours(0, 0, 0, 0);
  }

  return sprints;
}
```

---

## Code Examples

### React Hook for Sprint Management

```typescript
import { useState, useEffect } from 'react';

interface UseSprintOptions {
  sprintId?: string;
  projectId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useSprint(options: UseSprintOptions = {}) {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [metrics, setMetrics] = useState<SprintMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = new SprintAPIClient(API_BASE_URL, authToken);

  // Load sprint data
  useEffect(() => {
    if (!options.sprintId) return;

    const loadSprint = async () => {
      setLoading(true);
      try {
        const [sprintData, metricsData] = await Promise.all([
          client.getSprint(options.sprintId!),
          client.getMetrics(options.sprintId!),
        ]);
        setSprint(sprintData);
        setMetrics(metricsData);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadSprint();

    // Auto-refresh
    if (options.autoRefresh) {
      const interval = setInterval(
        loadSprint,
        options.refreshInterval || 60000
      );
      return () => clearInterval(interval);
    }
  }, [options.sprintId, options.autoRefresh]);

  // Actions
  const startSprint = async () => {
    if (!sprint) return;
    try {
      const updated = await client.startSprint(sprint.id);
      setSprint(updated);
    } catch (err) {
      setError(err as Error);
    }
  };

  const completeSprint = async () => {
    if (!sprint) return;
    try {
      const updated = await client.completeSprint(sprint.id);
      setSprint(updated);
    } catch (err) {
      setError(err as Error);
    }
  };

  const addStories = async (storyIds: string[]) => {
    if (!sprint) return;
    try {
      const updated = await client.addStories(sprint.id, storyIds);
      setSprint(updated);
    } catch (err) {
      setError(err as Error);
    }
  };

  const addComment = async (content: string, type?: string) => {
    if (!sprint) return;
    try {
      await client.addComment(sprint.id, content, type);
      // Reload sprint to get updated comments
      const updated = await client.getSprint(sprint.id);
      setSprint(updated);
    } catch (err) {
      setError(err as Error);
    }
  };

  return {
    sprint,
    metrics,
    loading,
    error,
    startSprint,
    completeSprint,
    addStories,
    addComment,
  };
}

// Usage in component
function SprintDashboard({ sprintId }: { sprintId: string }) {
  const { sprint, metrics, loading, error, startSprint, completeSprint } =
    useSprint({ sprintId, autoRefresh: true });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!sprint || !metrics) return null;

  return (
    <div>
      <h1>{sprint.name}</h1>
      <p>Status: {sprint.status}</p>
      <p>Completion: {metrics.completionPercentage}%</p>

      {sprint.status === 'PLANNING' && (
        <button onClick={startSprint}>Start Sprint</button>
      )}

      {sprint.status === 'ACTIVE' && (
        <button onClick={completeSprint}>Complete Sprint</button>
      )}

      <div>
        <h3>Burndown Chart</h3>
        {/* Render burndown chart with metrics.burndownData */}
      </div>
    </div>
  );
}
```

### Vue.js Composable

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSprintMetrics(sprintId: string, autoRefresh = true) {
  const metrics = ref<SprintMetrics | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  let refreshInterval: number | null = null;

  const client = new SprintAPIClient(API_BASE_URL, authToken);

  const fetchMetrics = async () => {
    loading.value = true;
    try {
      metrics.value = await client.getMetrics(sprintId);
      error.value = null;
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchMetrics();

    if (autoRefresh) {
      refreshInterval = setInterval(fetchMetrics, 60000);
    }
  });

  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}
```

### Angular Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SprintService {
  private baseUrl = 'https://api.example.com/api/sprints';
  private sprintSubject = new BehaviorSubject<Sprint | null>(null);
  public sprint$ = this.sprintSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  private getToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  createSprint(data: CreateSprintDto): Observable<Sprint> {
    return this.http.post<Sprint>(
      this.baseUrl,
      data,
      { headers: this.getHeaders() }
    ).pipe(
      tap(sprint => this.sprintSubject.next(sprint))
    );
  }

  getSprint(id: string): Observable<Sprint> {
    return this.http.get<Sprint>(
      `${this.baseUrl}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(sprint => this.sprintSubject.next(sprint))
    );
  }

  startSprint(id: string): Observable<Sprint> {
    return this.http.post<Sprint>(
      `${this.baseUrl}/${id}/start`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(sprint => this.sprintSubject.next(sprint))
    );
  }

  completeSprint(id: string): Observable<Sprint> {
    return this.http.post<Sprint>(
      `${this.baseUrl}/${id}/complete`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(sprint => this.sprintSubject.next(sprint))
    );
  }

  getMetrics(id: string): Observable<SprintMetrics> {
    return this.http.get<SprintMetrics>(
      `${this.baseUrl}/${id}/metrics`,
      { headers: this.getHeaders() }
    );
  }
}
```

---

## Error Handling

### Comprehensive Error Handler

```typescript
class SprintAPIErrorHandler {
  static handle(error: unknown): never {
    if (error instanceof APIError) {
      switch (error.statusCode) {
        case 400:
          throw new ValidationError(error.message);
        case 401:
          throw new AuthenticationError('Please log in again');
        case 404:
          throw new NotFoundError(error.message);
        case 409:
          throw new ConflictError(error.message);
        case 500:
          throw new ServerError('Server error, please try again later');
        default:
          throw new UnknownError(error.message);
      }
    }

    if (error instanceof TypeError) {
      throw new NetworkError('Network error, please check your connection');
    }

    throw new UnknownError('An unexpected error occurred');
  }

  static async wrapAsync<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return this.handle(error);
    }
  }
}

// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class UnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownError';
  }
}

// Usage
async function createSprintSafely(data: CreateSprintDto) {
  return SprintAPIErrorHandler.wrapAsync(async () => {
    return await client.createSprint(data);
  });
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError!;
}

// Usage
const sprint = await withRetry(() => client.getSprint(sprintId));
```

---

## Best Practices

### 1. Token Management

```typescript
class TokenManager {
  private static TOKEN_KEY = 'auth_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static EXPIRY_KEY = 'token_expiry';

  static setToken(token: string, expiresIn: number) {
    localStorage.setItem(this.TOKEN_KEY, token);
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(this.EXPIRY_KEY, expiry.toString());
  }

  static getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.EXPIRY_KEY);

    if (!token || !expiry) return null;

    if (Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }

    return token;
  }

  static clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);
  }

  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
```

### 2. Request Caching

```typescript
class CachedSprintClient extends SprintAPIClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 60000; // 1 minute

  async getSprint(id: string, useCache = true): Promise<Sprint> {
    const cacheKey = `sprint:${id}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }
    }

    const sprint = await super.getSprint(id);
    this.cache.set(cacheKey, { data: sprint, timestamp: Date.now() });
    return sprint;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### 3. Optimistic Updates

```typescript
async function updateSprintOptimistically(
  sprintId: string,
  updates: UpdateSprintDto,
  onUpdate: (sprint: Sprint) => void
) {
  // Get current sprint
  const currentSprint = await client.getSprint(sprintId);

  // Apply optimistic update
  const optimisticSprint = { ...currentSprint, ...updates };
  onUpdate(optimisticSprint);

  try {
    // Make actual API call
    const updatedSprint = await client.updateSprint(sprintId, updates);
    onUpdate(updatedSprint);
  } catch (error) {
    // Revert on error
    onUpdate(currentSprint);
    throw error;
  }
}
```

### 4. Batch Operations

```typescript
async function batchAddStories(
  sprintId: string,
  storyIds: string[],
  batchSize: number = 10
) {
  const batches: string[][] = [];

  for (let i = 0; i < storyIds.length; i += batchSize) {
    batches.push(storyIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await client.addStories(sprintId, batch);
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

---

## Testing & Debugging

### Unit Tests (Jest)

```typescript
import { describe, it, expect, jest } from '@jest/globals';

describe('SprintAPIClient', () => {
  let client: SprintAPIClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    client = new SprintAPIClient('https://api.test.com', 'test-token');
  });

  it('should create sprint successfully', async () => {
    const mockSprint = {
      id: 'sprint-123',
      name: 'Sprint 1',
      status: 'PLANNING',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSprint,
    });

    const result = await client.createSprint({
      name: 'Sprint 1',
      startDate: '2025-01-01',
      endDate: '2025-01-14',
      projectId: 'project-123',
    });

    expect(result).toEqual(mockSprint);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/sprints',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });

  it('should handle errors correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid date range' }),
    });

    await expect(
      client.createSprint({
        name: 'Sprint 1',
        startDate: '2025-01-14',
        endDate: '2025-01-01',
        projectId: 'project-123',
      })
    ).rejects.toThrow('Invalid date range');
  });
});
```

### Integration Tests

```typescript
describe('Sprint Lifecycle Integration', () => {
  let client: SprintAPIClient;
  let testProjectId: string;

  beforeAll(async () => {
    // Set up test environment
    const token = await login('test@example.com', 'password');
    client = new SprintAPIClient(TEST_API_URL, token);
    testProjectId = await createTestProject();
  });

  afterAll(async () => {
    // Clean up
    await deleteTestProject(testProjectId);
  });

  it('should complete full sprint lifecycle', async () => {
    // Create sprint
    const sprint = await client.createSprint({
      name: 'Test Sprint',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: testProjectId,
    });

    expect(sprint.status).toBe('PLANNING');

    // Start sprint
    const activeSprint = await client.startSprint(sprint.id);
    expect(activeSprint.status).toBe('ACTIVE');

    // Complete sprint
    const completedSprint = await client.completeSprint(sprint.id);
    expect(completedSprint.status).toBe('COMPLETED');
    expect(completedSprint.velocity).toBeDefined();
  });
});
```

### Debugging Tips

```typescript
// Enable request logging
class DebugSprintClient extends SprintAPIClient {
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.group(`API Request: ${options.method || 'GET'} ${endpoint}`);
    console.log('Options:', options);

    const startTime = Date.now();

    try {
      const result = await super.request<T>(endpoint, options);
      const duration = Date.now() - startTime;

      console.log('Success:', result);
      console.log(`Duration: ${duration}ms`);
      console.groupEnd();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('Error:', error);
      console.log(`Duration: ${duration}ms`);
      console.groupEnd();

      throw error;
    }
  }
}
```

---

## Production Considerations

### 1. Environment Configuration

```typescript
interface APIConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheDuration: number;
}

const configs: Record<string, APIConfig> = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 30000,
    retryAttempts: 1,
    cacheDuration: 0,
  },
  staging: {
    baseUrl: 'https://staging-api.example.com/api',
    timeout: 15000,
    retryAttempts: 2,
    cacheDuration: 30000,
  },
  production: {
    baseUrl: 'https://api.example.com/api',
    timeout: 10000,
    retryAttempts: 3,
    cacheDuration: 60000,
  },
};

const config = configs[process.env.NODE_ENV || 'development'];
```

### 2. Monitoring & Analytics

```typescript
class MonitoredSprintClient extends SprintAPIClient {
  private analytics: Analytics;

  constructor(baseUrl: string, token: string, analytics: Analytics) {
    super(baseUrl, token);
    this.analytics = analytics;
  }

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const startTime = Date.now();
    const method = options.method || 'GET';

    try {
      const result = await super.request<T>(endpoint, options);

      this.analytics.track('api_request', {
        endpoint,
        method,
        duration: Date.now() - startTime,
        status: 'success',
      });

      return result;
    } catch (error) {
      this.analytics.track('api_request', {
        endpoint,
        method,
        duration: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}
```

### 3. Rate Limiting Handling

```typescript
class RateLimitedClient extends SprintAPIClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 100;
  private requestCount = 0;
  private windowStart = Date.now();

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await super.request<T>(endpoint, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;

    while (this.requestQueue.length > 0) {
      // Reset counter if window expired
      if (Date.now() - this.windowStart > 60000) {
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      // Wait if rate limit reached
      if (this.requestCount >= this.requestsPerMinute) {
        const waitTime = 60000 - (Date.now() - this.windowStart);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      const request = this.requestQueue.shift();
      if (request) {
        await request();
        this.requestCount++;
      }
    }

    this.processing = false;
  }
}
```

### 4. Security Best Practices

```typescript
// Don't expose tokens in logs
class SecureClient extends SprintAPIClient {
  protected logRequest(endpoint: string, options: RequestInit) {
    const sanitizedOptions = { ...options };

    if (sanitizedOptions.headers) {
      sanitizedOptions.headers = {
        ...sanitizedOptions.headers,
        Authorization: '[REDACTED]',
      };
    }

    console.log('Request:', endpoint, sanitizedOptions);
  }
}

// Implement CSRF protection
class CSRFProtectedClient extends SprintAPIClient {
  private csrfToken: string | null = null;

  async refreshCSRFToken() {
    const response = await fetch(`${this.baseUrl}/csrf-token`);
    const { token } = await response.json();
    this.csrfToken = token;
  }

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.csrfToken) {
      await this.refreshCSRFToken();
    }

    const enhancedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': this.csrfToken!,
      },
    };

    return super.request<T>(endpoint, enhancedOptions);
  }
}
```

---

## TypeScript Types

```typescript
// Complete type definitions for Sprint API

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  capacity?: number;
  velocity?: number;
  status: SprintStatus;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  stories?: Story[];
  comments?: SprintComment[];
  retrospectives?: any[];
}

interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  capacity?: number;
  projectId: string;
}

interface UpdateSprintDto {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: SprintStatus;
}

interface AddStoriesDto {
  storyIds: string[];
}

interface CreateSprintCommentDto {
  content: string;
  type?: CommentType;
}

interface SprintComment {
  id: string;
  content: string;
  type: CommentType;
  sprintId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  sprint?: Sprint;
}

interface SprintMetrics {
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  completionPercentage: number;
  storiesCount: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
  velocity?: number;
  burndownData: BurndownDataPoint[];
}

interface BurndownDataPoint {
  date: string;
  remainingPoints: number;
  idealRemaining: number;
}

interface Story {
  id: string;
  title: string;
  description?: string;
  storyPoints?: number;
  status: StoryStatus;
  priority: Priority;
  rank: number;
  sprintId?: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  assignee?: User;
  creator?: User;
  tasks?: Task[];
  comments?: Comment[];
}

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
}

interface User {
  id: string;
  email: string;
  fullName?: string;
}

type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';
type StoryStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type CommentType =
  | 'GENERAL'
  | 'IMPEDIMENT'
  | 'DECISION'
  | 'QUESTION'
  | 'ANSWER'
  | 'ACTION_ITEM';
```

---

## Support & Resources

- **API Documentation**: See `sprint-api.md` for complete endpoint reference
- **OpenAPI Specification**: See `sprint-api-openapi.yaml` for machine-readable spec
- **Issue Tracking**: Report issues via project repository
- **Community**: Join developer community for support

---

**Last Updated**: 2025-10-24
**Guide Version**: 1.0.0
**API Version**: 1.0.0

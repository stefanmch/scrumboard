import { Sprint, SprintMetrics, BurndownDataPoint, Comment } from '@/types';
import { ApiError } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  capacity?: number;
  projectId: string;
}

export interface UpdateSprintDto {
  name?: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
}

export interface SprintFilters {
  projectId?: string;
  status?: Sprint['status'];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorBody;
        }
      }
    } catch {
      // Use original message
    }

    throw new ApiError(response.status, errorMessage);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError(response.status, 'Invalid response format', error as Error);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function makeRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'Network error occurred', error as Error, true);
  }
}

export const sprintsApi = {
  /**
   * Get all sprints with optional filtering
   * @param filters - Optional filters including projectId for project-scoped queries
   */
  async getAll(filters?: SprintFilters): Promise<Sprint[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);

    const url = `${API_URL}/api/v1/sprints${params.toString() ? `?${params.toString()}` : ''}`;
    return makeRequest<Sprint[]>(url, { method: 'GET' });
  },

  /**
   * Get all sprints for a specific project
   * @param projectId - Project ID to filter sprints by
   */
  async getAllForProject(projectId: string): Promise<Sprint[]> {
    return this.getAll({ projectId });
  },

  async getById(id: string): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${id}`, { method: 'GET' });
  },

  async create(data: CreateSprintDto): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateSprintDto): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return makeRequest<void>(`${API_URL}/api/v1/sprints/${id}`, {
      method: 'DELETE',
    });
  },

  async start(id: string): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${id}/start`, {
      method: 'POST',
    });
  },

  async complete(id: string): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${id}/complete`, {
      method: 'POST',
    });
  },

  async addStories(id: string, storyIds: string[]): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${id}/stories`, {
      method: 'POST',
      body: JSON.stringify({ storyIds }),
    });
  },

  async removeStory(sprintId: string, storyId: string): Promise<Sprint> {
    return makeRequest<Sprint>(`${API_URL}/api/v1/sprints/${sprintId}/stories/${storyId}`, {
      method: 'DELETE',
    });
  },

  async getMetrics(id: string): Promise<SprintMetrics> {
    return makeRequest<SprintMetrics>(`${API_URL}/api/v1/sprints/${id}/metrics`, {
      method: 'GET',
    });
  },

  async addComment(id: string, content: string): Promise<Comment> {
    return makeRequest<Comment>(`${API_URL}/api/v1/sprints/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async getComments(id: string): Promise<Comment[]> {
    return makeRequest<Comment[]>(`${API_URL}/api/v1/sprints/${id}/comments`, {
      method: 'GET',
    });
  },
};

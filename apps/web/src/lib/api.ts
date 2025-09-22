import { Story, StoryStatus } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }
  return response.json();
}

export const storiesApi = {
  async getAll(projectId?: string, sprintId?: string): Promise<Story[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (sprintId) params.append('sprintId', sprintId);

    const url = `${API_URL}/stories${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    return handleResponse<Story[]>(response);
  },

  async getById(id: string): Promise<Story> {
    const response = await fetch(`${API_URL}/stories/${id}`);
    return handleResponse<Story>(response);
  },

  async getByStatus(status: Story['status'], projectId?: string): Promise<Story[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);

    const url = `${API_URL}/stories/by-status/${status}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    return handleResponse<Story[]>(response);
  },

  async create(story: { title: string; description?: string; storyPoints?: number; status: StoryStatus; assigneeId?: string }): Promise<Story> {
    const response = await fetch(`${API_URL}/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(story),
    });
    return handleResponse<Story>(response);
  },

  async update(id: string, updates: { title?: string; description?: string; storyPoints?: number; assigneeId?: string }): Promise<Story> {
    const response = await fetch(`${API_URL}/stories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return handleResponse<Story>(response);
  },

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    const response = await fetch(`${API_URL}/stories/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Story>(response);
  },

  async moveToSprint(id: string, sprintId: string | null): Promise<Story> {
    const response = await fetch(`${API_URL}/stories/${id}/move-to-sprint`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sprintId }),
    });
    return handleResponse<Story>(response);
  },

  async reorder(storyIds: string[]): Promise<Story[]> {
    const response = await fetch(`${API_URL}/stories/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storyIds }),
    });
    return handleResponse<Story[]>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/stories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }
  },
};
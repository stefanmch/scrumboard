import { Story, StoryStatus } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: Error,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isRetryable(): boolean {
    // Network errors and server errors are retryable, but not client errors
    return this.isNetworkError || this.isServerError;
  }

  getUserFriendlyMessage(): string {
    if (this.isNetworkError) {
      return 'Connection failed. Please check your internet connection and try again.';
    }

    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource could not be found.';
      case 409:
        return 'This action conflicts with the current state. Please refresh and try again.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error. Please try again in a few moments.';
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  maxDelay: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffFactor: 2,
  maxDelay: 10000
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries, initialDelay, backoffFactor, maxDelay } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };

  let lastError: ApiError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof ApiError ? error : new ApiError(0, 'Unknown error', error as Error);

      // Don't retry if it's not a retryable error or if this is the last attempt
      if (!lastError.isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await sleep(Math.min(delay, maxDelay));
      delay *= backoffFactor;
    }
  }

  throw lastError!;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      // Try to get error details from response body
      const errorBody = await response.text();
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          // If it's not JSON, use the text as is
          errorMessage = errorBody;
        }
      }
    } catch {
      // If we can't read the body, stick with the original message
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
  options: RequestInit = {},
  retryOptions?: Partial<RetryOptions>
): Promise<T> {
  return withRetry(async () => {
    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        }
      });
    } catch (error) {
      // Network error
      throw new ApiError(
        0,
        'Network error occurred',
        error as Error,
        true
      );
    }

    return handleResponse<T>(response);
  }, retryOptions);
}

export const storiesApi = {
  async getAll(projectId?: string, sprintId?: string): Promise<Story[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (sprintId) params.append('sprintId', sprintId);

    const url = `${API_URL}/api/v1/stories${params.toString() ? `?${params.toString()}` : ''}`;
    return makeRequest<Story[]>(url, { method: 'GET' });
  },

  async getById(id: string): Promise<Story> {
    return makeRequest<Story>(`${API_URL}/api/v1/stories/${id}`, { method: 'GET' });
  },

  async getByStatus(status: Story['status'], projectId?: string): Promise<Story[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);

    const url = `${API_URL}/api/v1/stories/by-status/${status}${params.toString() ? `?${params.toString()}` : ''}`;
    return makeRequest<Story[]>(url, { method: 'GET' });
  },

  async create(story: { title: string; description?: string; storyPoints?: number; status: StoryStatus; assigneeId?: string; projectId?: string }): Promise<Story> {
    // Add default projectId if not provided
    const storyData = {
      ...story,
      projectId: story.projectId || 'default-project'
    };
    return makeRequest<Story>(`${API_URL}/api/v1/stories`, {
      method: 'POST',
      body: JSON.stringify(storyData),
    }, { maxRetries: 2 }); // Fewer retries for create operations
  },

  async update(id: string, updates: { title?: string; description?: string; storyPoints?: number; assigneeId?: string }): Promise<Story> {
    return makeRequest<Story>(`${API_URL}/api/v1/stories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, { maxRetries: 2 }); // Fewer retries for update operations
  },

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    return makeRequest<Story>(`${API_URL}/api/v1/stories/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, { maxRetries: 1 }); // Minimal retries for status updates to avoid conflicts
  },

  async moveToSprint(id: string, sprintId: string | null): Promise<Story> {
    return makeRequest<Story>(`${API_URL}/api/v1/stories/${id}/move-to-sprint`, {
      method: 'PUT',
      body: JSON.stringify({ sprintId }),
    });
  },

  async reorder(storyIds: string[]): Promise<Story[]> {
    return makeRequest<Story[]>(`${API_URL}/api/v1/stories/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ storyIds }),
    }, { maxRetries: 1 }); // Minimal retries for reorder to avoid conflicts
  },

  async delete(id: string): Promise<void> {
    return makeRequest<void>(`${API_URL}/api/v1/stories/${id}`, {
      method: 'DELETE',
    }, { maxRetries: 2 });
  },
};
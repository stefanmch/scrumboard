import { Story, StoryStatus, Comment } from '@/types'
import { ApiError } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorBody = await response.text()
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          errorMessage = errorBody
        }
      }
    } catch {
      // Stick with original message
    }

    throw new ApiError(response.status, errorMessage)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new ApiError(response.status, 'Invalid response format', error as Error)
  }
}

export interface BacklogFilters {
  refinementStatus?: string[]
  status?: StoryStatus[]
  type?: string[]
  priority?: string[]
  assigneeId?: string[]
  hasNoAssignee?: boolean
  hasNoSprint?: boolean
  parentId?: string[]
  hasChildren?: boolean
  storyPointsMin?: number
  storyPointsMax?: number
  search?: string
}

export interface BacklogQueryParams extends BacklogFilters {
  sortBy?: 'rank' | 'priority' | 'businessValue' | 'storyPoints' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface BacklogResponse {
  stories: Story[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const enhancedStoriesApi = {
  /**
   * Get stories with advanced filtering and sorting
   */
  async getBacklog(projectId: string, params?: BacklogQueryParams): Promise<Story[]> {
    const queryParams = new URLSearchParams({ projectId })

    if (params) {
      if (params.refinementStatus?.length) {
        params.refinementStatus.forEach(s => queryParams.append('refinementStatus', s))
      }
      if (params.status?.length) {
        params.status.forEach(s => queryParams.append('status', s))
      }
      if (params.type?.length) {
        params.type.forEach(t => queryParams.append('type', t))
      }
      if (params.priority?.length) {
        params.priority.forEach(p => queryParams.append('priority', p))
      }
      if (params.assigneeId?.length) {
        params.assigneeId.forEach(a => queryParams.append('assigneeId', a))
      }
      if (params.hasNoAssignee !== undefined) {
        queryParams.append('hasNoAssignee', String(params.hasNoAssignee))
      }
      if (params.hasNoSprint !== undefined) {
        queryParams.append('hasNoSprint', String(params.hasNoSprint))
      }
      if (params.parentId?.length) {
        params.parentId.forEach(p => queryParams.append('parentId', p))
      }
      if (params.hasChildren !== undefined) {
        queryParams.append('hasChildren', String(params.hasChildren))
      }
      if (params.storyPointsMin !== undefined) {
        queryParams.append('storyPointsMin', String(params.storyPointsMin))
      }
      if (params.storyPointsMax !== undefined) {
        queryParams.append('storyPointsMax', String(params.storyPointsMax))
      }
      if (params.search) {
        queryParams.append('search', params.search)
      }
      if (params.sortBy) {
        queryParams.append('sortBy', params.sortBy)
      }
      if (params.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder)
      }
      if (params.limit) {
        queryParams.append('limit', String(params.limit))
      }
      if (params.offset) {
        queryParams.append('offset', String(params.offset))
      }
    }

    const url = `${API_URL}/api/v1/stories/backlog?${queryParams.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const result = await handleResponse<BacklogResponse>(response)
    // Extract just the stories array from the paginated response
    return result.stories
  },

  /**
   * Get story with full hierarchy (parent and children)
   */
  async getWithHierarchy(id: string): Promise<Story> {
    const url = `${API_URL}/api/v1/stories/${id}/hierarchy`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<Story>(response)
  },

  /**
   * Split a story into multiple child stories
   */
  async splitStory(
    id: string,
    splitData: {
      childStories: Array<{
        title: string
        description?: string
        acceptanceCriteria?: string
        storyPoints?: number
      }>
    }
  ): Promise<Story[]> {
    const url = `${API_URL}/api/v1/stories/${id}/split`
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(splitData),
    })

    return handleResponse<Story[]>(response)
  },

  /**
   * Link a story to a parent (create hierarchy)
   */
  async linkToParent(id: string, parentId: string | null): Promise<Story> {
    const url = `${API_URL}/api/v1/stories/${id}/link-parent`
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ parentId }),
    })

    return handleResponse<Story>(response)
  },

  /**
   * Bulk update stories
   */
  async bulkUpdate(
    storyIds: string[],
    updates: Partial<Story>
  ): Promise<Story[]> {
    const url = `${API_URL}/api/v1/stories/bulk-update`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ storyIds, updates }),
    })

    return handleResponse<Story[]>(response)
  },

  /**
   * Update refinement status
   */
  async updateRefinementStatus(
    id: string,
    refinementStatus: string
  ): Promise<Story> {
    const url = `${API_URL}/api/v1/stories/${id}/refinement-status`
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refinementStatus }),
    })

    return handleResponse<Story>(response)
  },

  /**
   * Reorder stories in backlog
   */
  async reorderBacklog(
    projectId: string,
    storyIds: string[]
  ): Promise<Story[]> {
    const url = `${API_URL}/api/v1/stories/reorder-backlog`
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, storyIds }),
    })

    return handleResponse<Story[]>(response)
  },
}

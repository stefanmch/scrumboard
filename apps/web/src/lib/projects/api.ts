import { ApiError } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  teamId: string
  teamName?: string
  createdAt: Date
  updatedAt: Date
  storyCount?: number
  sprintCount?: number
  taskCount?: number
}

export interface ProjectStats {
  projectId: string
  projectName: string
  totalStories: number
  completedStories: number
  totalSprints: number
  activeSprints: number
  completedSprints: number
  totalTasks: number
  completedTasks: number
  completionPercentage: number
}

export interface CreateProjectData {
  name: string
  description?: string
  status?: ProjectStatus
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: ProjectStatus
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorBody = await response.text()
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody)
          if (Array.isArray(errorJson.message)) {
            errorMessage = errorJson.message.join(', ')
          } else {
            errorMessage = errorJson.message || errorJson.error || errorMessage
          }
        } catch {
          errorMessage = errorBody
        }
      }
    } catch {
      // Stick with original message
    }

    throw new ApiError(response.status, errorMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  try {
    return await response.json()
  } catch (error) {
    throw new ApiError(response.status, 'Invalid response format', error as Error)
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

export const projectsApi = {
  async create(teamId: string, data: CreateProjectData): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  async getAllForTeam(teamId: string): Promise<Project[]> {
    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/projects`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async getById(id: string): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async getStats(id: string): Promise<ProjectStats> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}/stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  }
}

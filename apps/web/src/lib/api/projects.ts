import { ApiError } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  teamId: string
  teamName?: string
  createdAt: Date | string
  updatedAt: Date | string
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
  /**
   * Get all projects for the current user
   */
  async getAll(): Promise<Project[]> {
    const response = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Get all projects for a specific team
   * Note: After migration, this returns all projects and filters client-side
   */
  async getAllForTeam(teamId: string): Promise<Project[]> {
    const response = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    const projects = await handleResponse<Project[]>(response)
    // Filter to projects for this team (backend returns all user's projects)
    // TODO: Update after backend supports team filtering
    return projects
  },

  /**
   * Get a specific project by ID
   */
  async getById(id: string): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Get project statistics
   */
  async getStats(id: string): Promise<ProjectStats> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}/stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Create a new project for a team
   * Note: New API accepts teamIds array
   */
  async create(teamId: string, data: CreateProjectData): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...data,
        teamIds: [teamId] // Convert to array for new many-to-many API
      })
    })

    return handleResponse(response)
  },

  /**
   * Update an existing project
   */
  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  /**
   * Delete a project
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  }
}

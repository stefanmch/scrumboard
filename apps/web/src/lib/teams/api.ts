import { ApiError } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type UserRole = 'ADMIN' | 'MEMBER'

export interface Team {
  id: string
  name: string
  description?: string
  creatorId: string
  createdAt: Date
  updatedAt: Date
  members?: TeamMember[]
  memberCount?: number
}

export interface TeamMember {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  teamId: string
  role: UserRole
  joinedAt: Date
}

export interface CreateTeamData {
  name: string
  description?: string
}

export interface UpdateTeamData {
  name?: string
  description?: string
}

export interface AddMemberData {
  userId: string
  role: UserRole
}

export interface UpdateMemberRoleData {
  role: UserRole
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

export const teamsApi = {
  async create(data: CreateTeamData): Promise<Team> {
    const response = await fetch(`${API_URL}/api/v1/teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  async getAll(): Promise<Team[]> {
    const response = await fetch(`${API_URL}/api/v1/teams`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async getById(id: string): Promise<Team> {
    const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async update(id: string, data: UpdateTeamData): Promise<Team> {
    const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async addMember(teamId: string, data: AddMemberData): Promise<TeamMember> {
    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  async updateMemberRole(teamId: string, userId: string, data: UpdateMemberRoleData): Promise<TeamMember> {
    const response = await fetch(`${API_URL}/api/v1/teams/${teamId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })

    return handleResponse(response)
  }
}

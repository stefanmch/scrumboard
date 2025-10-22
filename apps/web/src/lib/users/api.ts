import { API_URL } from '../api'

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
  bio?: string
  timezone?: string
  workingHours?: {
    start: string
    end: string
  }
  notifications?: {
    email: boolean
    push: boolean
    mentions: boolean
    updates: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface UpdateUserDto {
  name?: string
  bio?: string
  timezone?: string
  workingHours?: {
    start: string
    end: string
  }
  notifications?: {
    email: boolean
    push: boolean
    mentions: boolean
    updates: boolean
  }
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

class UsersApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async getUserProfile(userId: string): Promise<User> {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch user profile')
    }

    return response.json()
  }

  async updateUserProfile(
    userId: string,
    data: UpdateUserDto
  ): Promise<User> {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update user profile')
    }

    return response.json()
  }

  async uploadAvatar(userId: string, file: File): Promise<User> {
    const token = localStorage.getItem('accessToken')
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload avatar')
    }

    return response.json()
  }

  async changePassword(
    userId: string,
    data: ChangePasswordDto
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/users/${userId}/password`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to change password')
    }

    return response.json()
  }

  async getUserActivity(userId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/users/${userId}/activity`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch user activity')
    }

    return response.json()
  }
}

export const usersApi = new UsersApiClient()

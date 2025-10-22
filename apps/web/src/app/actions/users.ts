'use server'

import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

/**
 * Get Authorization header from cookies
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')

  return {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken.value}` }),
  }
}

/**
 * Server action to get user profile
 */
export async function getUserProfileAction(
  userId: string,
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/users/${userId}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to fetch user profile',
      }
    }

    const user = await response.json()
    return { success: true, user }
  } catch (error) {
    console.error('Get user profile error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to update user profile
 */
export async function updateUserProfileAction(
  userId: string,
  data: UpdateUserDto,
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to update user profile',
      }
    }

    const user = await response.json()
    return { success: true, user }
  } catch (error) {
    console.error('Update user profile error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to change password
 */
export async function changePasswordAction(
  userId: string,
  data: ChangePasswordDto,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/users/${userId}/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to change password',
      }
    }

    const result = await response.json()
    return { success: true, message: result.message || 'Password changed successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to upload avatar
 * Note: Receives the file as a File object from the client
 */
export async function uploadAvatarAction(
  userId: string,
  fileData: { name: string; type: string; size: number; arrayBuffer: ArrayBuffer },
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')

    // Create FormData and append the file
    const formData = new FormData()
    const blob = new Blob([fileData.arrayBuffer], { type: fileData.type })
    const file = new File([blob], fileData.name, { type: fileData.type })
    formData.append('avatar', file)

    const response = await fetch(`${API_URL}/api/v1/users/${userId}/avatar`, {
      method: 'POST',
      headers: {
        ...(accessToken && { Authorization: `Bearer ${accessToken.value}` }),
        // Don't set Content-Type - let fetch handle it for FormData
      },
      body: formData,
    })

    if (!response.ok) {
      let errorMessage = 'Failed to upload avatar'
      try {
        const error = await response.json()
        errorMessage = error.message || errorMessage
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`
      }
      return {
        success: false,
        error: errorMessage,
      }
    }

    const user = await response.json()
    return { success: true, user }
  } catch (error) {
    console.error('Upload avatar error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

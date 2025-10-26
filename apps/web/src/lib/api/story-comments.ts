import { Comment } from '@/types'
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

export interface CreateCommentData {
  content: string
  type?: 'GENERAL' | 'IMPEDIMENT' | 'QUESTION' | 'DECISION' | 'ACTION_ITEM'
}

export const storyCommentsApi = {
  /**
   * Get all comments for a story
   */
  async getComments(storyId: string): Promise<Comment[]> {
    const url = `${API_URL}/api/v1/stories/${storyId}/comments`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse<Comment[]>(response)
  },

  /**
   * Create a new comment
   */
  async createComment(storyId: string, data: CreateCommentData): Promise<Comment> {
    const url = `${API_URL}/api/v1/stories/${storyId}/comments`
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<Comment>(response)
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    const url = `${API_URL}/api/v1/comments/${commentId}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    })

    return handleResponse<Comment>(response)
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const url = `${API_URL}/api/v1/comments/${commentId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to delete comment')
    }
  },
}

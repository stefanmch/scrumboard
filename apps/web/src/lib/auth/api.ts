import { ApiError } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

async function handleAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorBody = await response.text()
      if (errorBody) {
        try {
          const errorJson = JSON.parse(errorBody)
          // Handle array of errors (validation errors)
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

  try {
    return await response.json()
  } catch (error) {
    throw new ApiError(response.status, 'Invalid response format', error as Error)
  }
}

export const authApi = {
  async register(data: RegisterData): Promise<{ user: User; message: string }> {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    return handleAuthResponse(response)
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const authResponse = await handleAuthResponse<AuthResponse>(response)

    // Store tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', authResponse.accessToken)
      localStorage.setItem('refreshToken', authResponse.refreshToken)
      localStorage.setItem('user', JSON.stringify(authResponse.user))
    }

    return authResponse
  },

  async logout(): Promise<void> {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

    if (accessToken) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        })
      } catch (error) {
        // Continue with local logout even if API call fails
        console.error('Logout API error:', error)
      }
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    return handleAuthResponse(response)
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    return handleAuthResponse(response)
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    })

    return handleAuthResponse(response)
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null

    const userStr = localStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser()
  },
}

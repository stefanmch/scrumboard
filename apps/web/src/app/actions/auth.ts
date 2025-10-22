'use server'

import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
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

interface ApiErrorResponse {
  message: string | string[]
  error?: string
  statusCode?: number
}

class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

async function handleAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorBody: ApiErrorResponse = await response.json()
      if (errorBody) {
        // Handle array of errors (validation errors)
        if (Array.isArray(errorBody.message)) {
          errorMessage = errorBody.message.join(', ')
        } else {
          errorMessage = errorBody.message || errorBody.error || errorMessage
        }
      }
    } catch {
      // If JSON parsing fails, use default error message
    }

    throw new AuthError(response.status, errorMessage)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new AuthError(response.status, 'Invalid response format', error as Error)
  }
}

/**
 * Server action to handle user login
 * Sets httpOnly cookies for secure token storage
 */
export async function loginAction(data: LoginData): Promise<
  | { success: true; user: User }
  | { success: false; error: string; statusCode?: number }
> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const authResponse = await handleAuthResponse<AuthResponse>(response)

    // Set httpOnly cookies for tokens
    const cookieStore = await cookies()

    // Access token - expires in 1 hour
    cookieStore.set('accessToken', authResponse.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authResponse.expiresIn || 3600, // Use provided expiry or default to 1 hour
      path: '/',
    })

    // Refresh token - expires in 7 days
    cookieStore.set('refreshToken', authResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // User info - not httpOnly as it needs to be accessible to client
    cookieStore.set('user', JSON.stringify(authResponse.user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return {
      success: true,
      user: authResponse.user,
    }
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof AuthError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to handle user logout
 * Clears all authentication cookies
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')

  // Call API logout endpoint if we have a token
  if (accessToken) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
      })
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error('Logout API error:', error)
    }
  }

  // Clear all auth cookies
  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
  cookieStore.delete('user')
}

/**
 * Server action to register a new user
 */
export async function registerAction(data: RegisterData): Promise<
  | { success: true; message: string }
  | { success: false; error: string; statusCode?: number }
> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await handleAuthResponse<{ user: User; message: string }>(response)

    return {
      success: true,
      message: result.message || 'Registration successful! Please check your email to verify your account.',
    }
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof AuthError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to verify user email
 */
export async function verifyEmailAction(token: string): Promise<
  | { success: true; message: string }
  | { success: false; error: string; statusCode?: number }
> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const result = await handleAuthResponse<{ message: string }>(response)

    return {
      success: true,
      message: result.message || 'Email verified successfully!',
    }
  } catch (error) {
    console.error('Email verification error:', error)

    if (error instanceof AuthError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to request password reset
 */
export async function forgotPasswordAction(email: string): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const result = await handleAuthResponse<{ message: string }>(response)

    return {
      success: true,
      message: result.message || 'Password reset instructions sent to your email.',
    }
  } catch (error) {
    console.error('Forgot password error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Server action to reset password with token
 */
export async function resetPasswordAction(token: string, newPassword: string): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    })

    const result = await handleAuthResponse<{ message: string }>(response)

    return {
      success: true,
      message: result.message || 'Password reset successful!',
    }
  } catch (error) {
    console.error('Reset password error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Get current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('user')

  if (!userCookie) return null

  try {
    return JSON.parse(userCookie.value)
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')
  const user = cookieStore.get('user')

  return !!(accessToken && user)
}

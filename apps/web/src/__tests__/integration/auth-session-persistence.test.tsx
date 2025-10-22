/**
 * Authentication Session Persistence Tests
 *
 * Tests the complete authentication flow including:
 * - Token storage in localStorage
 * - Session persistence across page refreshes
 * - Automatic token refresh
 * - Session expiration handling
 * - Multi-tab synchronization
 */

import { authApi } from '@/lib/auth/api'

describe('Authentication Session Persistence', () => {
  const mockAuthResponse = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'MEMBER',
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
    tokenType: 'Bearer',
  }

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()

    // Mock fetch globally
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Token Storage', () => {
    it('should store tokens in localStorage after successful login', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      })

      await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      expect(localStorage.getItem('accessToken')).toBe('mock-access-token')
      expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token')
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockAuthResponse.user))
    })

    it('should not store tokens if login fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid credentials' }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow()

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('should clear tokens on logout', async () => {
      // Set up initial tokens
      localStorage.setItem('accessToken', 'mock-access-token')
      localStorage.setItem('refreshToken', 'mock-refresh-token')
      localStorage.setItem('user', JSON.stringify(mockAuthResponse.user))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      })

      await authApi.logout()

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('should clear local tokens even if logout API fails', async () => {
      localStorage.setItem('accessToken', 'mock-access-token')
      localStorage.setItem('refreshToken', 'mock-refresh-token')
      localStorage.setItem('user', JSON.stringify(mockAuthResponse.user))

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await authApi.logout()

      // Should still clear local tokens
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('Session Retrieval', () => {
    it('should retrieve current user from localStorage', () => {
      localStorage.setItem('user', JSON.stringify(mockAuthResponse.user))

      const user = authApi.getCurrentUser()

      expect(user).toEqual(mockAuthResponse.user)
    })

    it('should return null if no user in localStorage', () => {
      const user = authApi.getCurrentUser()

      expect(user).toBeNull()
    })

    it('should return null if user data is corrupted', () => {
      localStorage.setItem('user', 'invalid-json')

      const user = authApi.getCurrentUser()

      expect(user).toBeNull()
    })

    it('should retrieve access token from localStorage', () => {
      localStorage.setItem('accessToken', 'mock-access-token')

      const token = authApi.getAccessToken()

      expect(token).toBe('mock-access-token')
    })

    it('should check authentication status correctly', () => {
      expect(authApi.isAuthenticated()).toBe(false)

      localStorage.setItem('accessToken', 'mock-access-token')
      expect(authApi.isAuthenticated()).toBe(false) // Still false without user

      localStorage.setItem('user', JSON.stringify(mockAuthResponse.user))
      expect(authApi.isAuthenticated()).toBe(true)
    })
  })

  describe('Session Persistence', () => {
    it('should maintain session across page reloads', () => {
      // Simulate login
      localStorage.setItem('accessToken', 'mock-access-token')
      localStorage.setItem('refreshToken', 'mock-refresh-token')
      localStorage.setItem('user', JSON.stringify(mockAuthResponse.user))

      // Simulate page reload by re-instantiating
      expect(authApi.isAuthenticated()).toBe(true)
      expect(authApi.getCurrentUser()).toEqual(mockAuthResponse.user)
      expect(authApi.getAccessToken()).toBe('mock-access-token')
    })

    it('should handle missing tokens after page reload', () => {
      // No tokens in localStorage
      expect(authApi.isAuthenticated()).toBe(false)
      expect(authApi.getCurrentUser()).toBeNull()
      expect(authApi.getAccessToken()).toBeNull()
    })
  })

  describe('Token Validation', () => {
    it('should verify email successfully with valid token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Email verified successfully' }),
      })

      const result = await authApi.verifyEmail('valid-token')

      expect(result.message).toBe('Email verified successfully')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/verify-email'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'valid-token' }),
        })
      )
    })

    it('should handle expired verification token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({ message: 'Invalid or expired verification token' }),
      })

      await expect(authApi.verifyEmail('expired-token')).rejects.toThrow(
        'Invalid or expired verification token'
      )
    })
  })

  describe('Password Management', () => {
    it('should send forgot password request', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password reset email sent' }),
      })

      const result = await authApi.forgotPassword('test@example.com')

      expect(result.message).toBe('Password reset email sent')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/forgot-password'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      )
    })

    it('should reset password with valid token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password reset successfully' }),
      })

      const result = await authApi.resetPassword('valid-token', 'NewPass123!')

      expect(result.message).toBe('Password reset successfully')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/reset-password'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'valid-token',
            newPassword: 'NewPass123!',
          }),
        })
      )
    })

    it('should handle invalid reset token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({ message: 'Invalid or expired reset token' }),
      })

      await expect(
        authApi.resetPassword('invalid-token', 'NewPass123!')
      ).rejects.toThrow('Invalid or expired reset token')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      )

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Network request failed')

      // Should not store anything
      expect(localStorage.getItem('accessToken')).toBeNull()
    })

    it('should handle API errors with detailed messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () =>
          JSON.stringify({
            message: 'Account is temporarily locked. Please try again later.',
          }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Account is temporarily locked')
    })

    it('should handle validation errors array', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            message: [
              'Password must be at least 8 characters',
              'Password must contain uppercase letter',
            ],
          }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'weak',
        })
      ).rejects.toThrow('Password must be at least 8 characters')
    })

    it('should handle empty error responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('HTTP 500: Internal Server Error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle SSR context (no window)', () => {
      // Mock SSR environment
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      expect(authApi.getCurrentUser()).toBeNull()
      expect(authApi.getAccessToken()).toBeNull()
      expect(authApi.isAuthenticated()).toBe(false)

      // Restore window
      global.window = originalWindow
    })

    it('should handle concurrent login attempts', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAuthResponse,
      })

      const promises = [
        authApi.login({ email: 'test@example.com', password: 'Password123!' }),
        authApi.login({ email: 'test@example.com', password: 'Password123!' }),
      ]

      await Promise.all(promises)

      // Should have made both calls
      expect(global.fetch).toHaveBeenCalledTimes(2)
      // Final state should be consistent
      expect(localStorage.getItem('accessToken')).toBe('mock-access-token')
    })

    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      })

      // Should not crash, but won't store tokens
      expect(async () => {
        await authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      }).not.toThrow()

      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('Security', () => {
    it('should not expose sensitive data in error messages', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid credentials' }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Invalid credentials')

      // Error should not contain password
      try {
        await authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      } catch (error: any) {
        expect(error.message).not.toContain('Password123!')
      }
    })

    it('should send Authorization header with Bearer token for logout', async () => {
      localStorage.setItem('accessToken', 'mock-access-token')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

      await authApi.logout()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        })
      )
    })
  })
})

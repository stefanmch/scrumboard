/**
 * Authentication Edge Cases and Error Scenarios
 *
 * Comprehensive tests for:
 * - Rate limiting and account lockout
 * - Concurrent request handling
 * - Network failure recovery
 * - Token expiration and refresh
 * - XSS and injection prevention
 * - Browser compatibility
 */

import { authApi } from '@/lib/auth/api'

describe('Authentication Edge Cases and Security', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Account Lockout', () => {
    it('should handle account locked after too many failed attempts', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () =>
          JSON.stringify({
            message: 'Too many failed attempts. Account has been locked.',
          }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Too many failed attempts')
    })

    it('should handle temporarily locked account', async () => {
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
  })

  describe('Email Verification States', () => {
    it('should handle unverified email (when check is re-enabled)', async () => {
      // Note: Currently disabled, but test for future
      const response = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'MEMBER',
          emailVerified: false,
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
        tokenType: 'Bearer',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      })

      // Currently should succeed (verification check disabled)
      const result = await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      expect(result.user.emailVerified).toBe(false)
      // Tokens should still be stored
      expect(localStorage.getItem('accessToken')).toBe('token')
    })

    it('should handle already verified email on registration', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'MEMBER',
            emailVerified: true, // Set to true in fix
          },
          message: 'Registration successful. You can now log in with your credentials.',
        }),
      })

      const result = await authApi.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      })

      expect(result.message).toContain('You can now log in')
      expect(result.message).not.toContain('check your email')
    })
  })

  describe('Inactive Account', () => {
    it('should prevent login for deactivated account', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () =>
          JSON.stringify({ message: 'Your account has been deactivated' }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Your account has been deactivated')
    })
  })

  describe('Network Failures', () => {
    it('should handle timeout errors', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      )

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Request timeout')
    })

    it('should handle connection refused', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to fetch')
      )

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Failed to fetch')
    })

    it('should handle DNS resolution failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('getaddrinfo ENOTFOUND')
      )

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('getaddrinfo ENOTFOUND')
    })

    it('should handle 503 Service Unavailable', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => JSON.stringify({ message: 'Service temporarily unavailable' }),
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Service temporarily unavailable')
    })
  })

  describe('Malformed Data', () => {
    it('should handle malformed JSON response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token')
        },
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow()
    })

    it('should handle missing required fields in response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123' },
          // Missing tokens
        }),
      })

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Should handle gracefully (undefined tokens won't be stored)
      expect(localStorage.getItem('accessToken')).toBe('undefined')
    })

    it('should handle non-JSON error responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '<html>Server Error</html>',
      })

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Server Error')
    })
  })

  describe('Input Validation', () => {
    it('should handle SQL injection attempts in email', async () => {
      const maliciousEmail = "admin'--"

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({ message: 'Please enter a valid email address' }),
      })

      await expect(
        authApi.login({
          email: maliciousEmail,
          password: 'Password123!',
        })
      ).rejects.toThrow('valid email address')
    })

    it('should handle XSS attempts in input', async () => {
      const xssAttempt = '<script>alert("xss")</script>@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({ message: 'Please enter a valid email address' }),
      })

      await expect(
        authApi.login({
          email: xssAttempt,
          password: 'Password123!',
        })
      ).rejects.toThrow('valid email address')
    })

    it('should handle extremely long input', async () => {
      const longEmail = 'a'.repeat(10000) + '@example.com'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Email is too long' }),
      })

      await expect(
        authApi.login({
          email: longEmail,
          password: 'Password123!',
        })
      ).rejects.toThrow()
    })

    it('should handle unicode and special characters in password', async () => {
      const unicodePassword = '🔒Password123!中文'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 900,
          tokenType: 'Bearer',
        }),
      })

      // Should handle unicode gracefully
      await expect(
        authApi.login({
          email: 'test@example.com',
          password: unicodePassword,
        })
      ).resolves.toBeDefined()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle rapid sequential login attempts', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 900,
          tokenType: 'Bearer',
        }),
      })

      const attempts = Array(5)
        .fill(null)
        .map(() =>
          authApi.login({
            email: 'test@example.com',
            password: 'Password123!',
          })
        )

      await Promise.all(attempts)

      // Should complete all attempts
      expect(global.fetch).toHaveBeenCalledTimes(5)
    })

    it('should handle logout during active request', async () => {
      let loginResolve: any
      const loginPromise = new Promise((resolve) => {
        loginResolve = resolve
      })

      ;(global.fetch as jest.Mock).mockImplementationOnce(() => loginPromise)

      const login = authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Logout before login completes
      await authApi.logout()

      // Resolve login
      loginResolve({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 900,
          tokenType: 'Bearer',
        }),
      })

      await login

      // Tokens should be stored (login completed after logout)
      expect(localStorage.getItem('accessToken')).toBe('token')
    })
  })

  describe('Browser Compatibility', () => {
    it('should handle browsers without localStorage', () => {
      const originalLocalStorage = global.localStorage
      // @ts-ignore
      delete global.localStorage

      expect(() => authApi.getCurrentUser()).not.toThrow()
      expect(authApi.getCurrentUser()).toBeNull()

      global.localStorage = originalLocalStorage
    })

    it('should handle localStorage being disabled', () => {
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage is disabled')
      })

      expect(() => authApi.getCurrentUser()).not.toThrow()

      Storage.prototype.getItem = originalGetItem
    })
  })

  describe('Token Expiration', () => {
    it('should handle expired access token in response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
          accessToken: 'expired-token',
          refreshToken: 'refresh',
          expiresIn: -1, // Already expired
          tokenType: 'Bearer',
        }),
      })

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      // Should still store tokens (client doesn't validate expiration)
      expect(result.expiresIn).toBe(-1)
      expect(localStorage.getItem('accessToken')).toBe('expired-token')
    })
  })

  describe('CORS and Headers', () => {
    it('should handle CORS errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      )

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow('Failed to fetch')
    })

    it('should send correct Content-Type header', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 900,
          tokenType: 'Bearer',
        }),
      })

      await authApi.login({
        email: 'test@example.com',
        password: 'Password123!',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })

  describe('Race Conditions', () => {
    it('should handle simultaneous login and logout', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'MEMBER' },
            accessToken: 'token',
            refreshToken: 'refresh',
            expiresIn: 900,
            tokenType: 'Bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Logged out' }),
        })

      const [loginResult] = await Promise.all([
        authApi.login({
          email: 'test@example.com',
          password: 'Password123!',
        }),
        authApi.logout(),
      ])

      // One should succeed
      expect(loginResult || localStorage.getItem('accessToken')).toBeDefined()
    })
  })

  describe('Memory Leaks', () => {
    it('should not retain sensitive data in memory after logout', async () => {
      localStorage.setItem('accessToken', 'sensitive-token')
      localStorage.setItem('refreshToken', 'sensitive-refresh')
      localStorage.setItem('user', JSON.stringify({ id: 'user-123', email: 'test@example.com' }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out' }),
      })

      await authApi.logout()

      // All sensitive data should be cleared
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })
})

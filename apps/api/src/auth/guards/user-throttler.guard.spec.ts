import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler'
import { UserThrottlerGuard } from './user-throttler.guard'
import { Request } from 'express'

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard
  let mockStorage: jest.Mocked<ThrottlerStorage>
  let mockReflector: jest.Mocked<Reflector>

  beforeEach(() => {
    mockStorage = {
      increment: jest.fn(),
      reset: jest.fn(),
      resetKey: jest.fn(),
    } as any

    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    } as any

    guard = new UserThrottlerGuard(
      { throttlers: [{ limit: 5, ttl: 60000 }], ignoreUserAgents: [] },
      mockStorage,
      mockReflector
    )
  })

  describe('getTracker', () => {
    it('should use email as tracker for login requests', async () => {
      const mockRequest = {
        body: { email: 'test@example.com', password: 'password' },
        ip: '192.168.1.1',
      } as Request

      const tracker = await guard['getTracker'](mockRequest)

      expect(tracker).toBe('user:test@example.com')
    })

    it('should use user ID as tracker for authenticated requests', async () => {
      const mockRequest = {
        user: { sub: 'user-123', email: 'test@example.com' },
        ip: '192.168.1.1',
      } as any

      const tracker = await guard['getTracker'](mockRequest)

      expect(tracker).toBe('user:user-123')
    })

    it('should fall back to IP address when no user context exists', async () => {
      const mockRequest = {
        body: {},
        ip: '192.168.1.1',
      } as Request

      const tracker = await guard['getTracker'](mockRequest)

      expect(tracker).toBe('192.168.1.1')
    })

    it('should handle missing IP address gracefully', async () => {
      const mockRequest = {
        body: {},
      } as Request

      const tracker = await guard['getTracker'](mockRequest)

      expect(tracker).toBe('unknown')
    })

    it('should prioritize email over user ID for login requests', async () => {
      const mockRequest = {
        body: { email: 'test@example.com' },
        user: { sub: 'user-123' },
        ip: '192.168.1.1',
      } as any

      const tracker = await guard['getTracker'](mockRequest)

      expect(tracker).toBe('user:test@example.com')
    })
  })

  describe('throwThrottlingException', () => {
    it('should throw exception with email identifier', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: { email: 'test@example.com' },
          }),
        }),
      } as ExecutionContext

      expect(() => guard['throwThrottlingException'](mockContext)).toThrow(
        ThrottlerException
      )

      try {
        guard['throwThrottlingException'](mockContext)
      } catch (error) {
        expect(error.message).toContain('test@example.com')
        expect(error.message).toContain('Too many login attempts')
      }
    })

    it('should throw exception with user ID identifier', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-123' },
            body: {},
          }),
        }),
      } as ExecutionContext

      expect(() => guard['throwThrottlingException'](mockContext)).toThrow(
        ThrottlerException
      )

      try {
        guard['throwThrottlingException'](mockContext)
      } catch (error) {
        expect(error.message).toContain('user-123')
      }
    })

    it('should use generic identifier when no user context exists', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: {},
          }),
        }),
      } as ExecutionContext

      try {
        guard['throwThrottlingException'](mockContext)
      } catch (error) {
        expect(error.message).toContain('your account')
      }
    })
  })

  describe('integration scenarios', () => {
    it('should track different users independently with same IP', async () => {
      const user1Request = {
        body: { email: 'user1@example.com' },
        ip: '192.168.1.1',
      } as Request

      const user2Request = {
        body: { email: 'user2@example.com' },
        ip: '192.168.1.1', // Same IP
      } as Request

      const tracker1 = await guard['getTracker'](user1Request)
      const tracker2 = await guard['getTracker'](user2Request)

      expect(tracker1).toBe('user:user1@example.com')
      expect(tracker2).toBe('user:user2@example.com')
      expect(tracker1).not.toBe(tracker2)
    })

    it('should track same user consistently across different IPs', async () => {
      const request1 = {
        body: { email: 'user@example.com' },
        ip: '192.168.1.1',
      } as Request

      const request2 = {
        body: { email: 'user@example.com' },
        ip: '10.0.0.1', // Different IP
      } as Request

      const tracker1 = await guard['getTracker'](request1)
      const tracker2 = await guard['getTracker'](request2)

      expect(tracker1).toBe('user:user@example.com')
      expect(tracker2).toBe('user:user@example.com')
      expect(tracker1).toBe(tracker2)
    })
  })
})

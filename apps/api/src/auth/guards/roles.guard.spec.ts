import { Test, TestingModule } from '@nestjs/testing'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY } from '../decorators/auth.decorator'
import { JwtPayload } from '../services/jwt.service'

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: jest.Mocked<Reflector>

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile()

    guard = module.get<RolesGuard>(RolesGuard)
    reflector = module.get<Reflector>(Reflector) as jest.Mocked<Reflector>
  })

  it('should be defined', () => {
    expect(guard).toBeDefined()
  })

  describe('canActivate', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = {
        user: null,
      }

      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null)

      const result = guard.canActivate(mockExecutionContext)

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ])
      expect(result).toBe(true)
    })

    it('should allow access when empty roles array is required', () => {
      reflector.getAllAndOverride.mockReturnValue([])

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('should throw ForbiddenException when user is not authenticated', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = null

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('User not authenticated')
      )
    })

    it('should allow access when user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('should allow access when user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SCRUM_MASTER'])
      mockRequest.user = {
        sub: '1',
        email: 'scrummaster@example.com',
        roles: ['SCRUM_MASTER'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('should allow access when user has multiple roles including required one', () => {
      reflector.getAllAndOverride.mockReturnValue(['DEVELOPER'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['DEVELOPER', 'MEMBER'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('should throw ForbiddenException when user does not have required role', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'member@example.com',
        roles: ['MEMBER'],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should throw ForbiddenException when user does not have any of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SCRUM_MASTER'])
      mockRequest.user = {
        sub: '1',
        email: 'member@example.com',
        roles: ['MEMBER', 'DEVELOPER'],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException(
          'Access denied. Required roles: ADMIN, SCRUM_MASTER'
        )
      )
    })

    it('should handle user with no roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: undefined,
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should handle user with empty roles array', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: [],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should be case sensitive for role comparison', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['admin'], // lowercase
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should handle special characters in role names', () => {
      reflector.getAllAndOverride.mockReturnValue(['SPECIAL-ROLE_123'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['SPECIAL-ROLE_123'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('should prioritize handler roles over class roles', () => {
      // Mock the reflector to return different values for handler vs class
      reflector.getAllAndOverride.mockReturnValue(['HANDLER_ROLE'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['HANDLER_ROLE'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ])
      expect(result).toBe(true)
    })
  })

  describe('Role Hierarchy Tests', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = { user: null }
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should work with all standard roles', () => {
      const standardRoles = [
        'ADMIN',
        'SCRUM_MASTER',
        'PRODUCT_OWNER',
        'DEVELOPER',
        'STAKEHOLDER',
        'MEMBER',
      ]

      standardRoles.forEach((role) => {
        reflector.getAllAndOverride.mockReturnValue([role])
        mockRequest.user = {
          sub: '1',
          email: 'user@example.com',
          roles: [role],
        } as JwtPayload

        const result = guard.canActivate(mockExecutionContext)
        expect(result).toBe(true)
      })
    })

    it('should handle complex role combinations', () => {
      const complexRoles = ['ADMIN', 'SCRUM_MASTER', 'PRODUCT_OWNER']
      reflector.getAllAndOverride.mockReturnValue(complexRoles)

      // Test user with ADMIN role
      mockRequest.user = {
        sub: '1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      } as JwtPayload

      let result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)

      // Test user with SCRUM_MASTER role
      mockRequest.user = {
        sub: '2',
        email: 'sm@example.com',
        roles: ['SCRUM_MASTER'],
      } as JwtPayload

      result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)

      // Test user with unauthorized role
      mockRequest.user = {
        sub: '3',
        email: 'dev@example.com',
        roles: ['DEVELOPER'],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException
      )
    })
  })

  describe('Error Message Tests', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = { user: null }
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should provide clear error message for single required role', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['MEMBER'],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should provide clear error message for multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([
        'ADMIN',
        'SCRUM_MASTER',
        'PRODUCT_OWNER',
      ])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['MEMBER'],
      } as JwtPayload

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException(
          'Access denied. Required roles: ADMIN, SCRUM_MASTER, PRODUCT_OWNER'
        )
      )
    })
  })

  describe('Edge Cases', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = { user: null }
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should handle malformed user object', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        // Missing required properties
        invalidProperty: 'value',
      }

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should handle user with null roles property', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: null,
      } as any

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new ForbiddenException('Access denied. Required roles: ADMIN')
      )
    })

    it('should handle very large roles arrays', () => {
      const manyRoles = Array.from({ length: 1000 }, (_, i) => `ROLE_${i}`)
      reflector.getAllAndOverride.mockReturnValue(['ROLE_500'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: manyRoles,
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)
    })

    it('should handle roles with special characters and numbers', () => {
      const specialRoles = [
        'ROLE-WITH-DASHES',
        'ROLE_WITH_UNDERSCORES',
        'ROLE123',
        'ROLE@SYMBOL',
      ]
      reflector.getAllAndOverride.mockReturnValue(specialRoles)
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['ROLE@SYMBOL'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)
    })

    it('should handle empty string roles', () => {
      reflector.getAllAndOverride.mockReturnValue([''])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: [''],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)
    })

    it('should handle duplicate roles in user array', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['ADMIN', 'ADMIN', 'ADMIN'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)
    })

    it('should handle duplicate roles in required array', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'ADMIN', 'MEMBER'])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['MEMBER'],
      } as JwtPayload

      const result = guard.canActivate(mockExecutionContext)
      expect(result).toBe(true)
    })
  })

  describe('Integration with Reflector', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = { user: null }
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should call reflector with correct parameters', () => {
      const mockHandler = jest.fn()
      const mockClass = jest.fn()
      mockExecutionContext.getHandler.mockReturnValue(mockHandler)
      mockExecutionContext.getClass.mockReturnValue(mockClass)

      reflector.getAllAndOverride.mockReturnValue(null)

      guard.canActivate(mockExecutionContext)

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockHandler,
        mockClass,
      ])
    })

    it('should handle reflector throwing errors', () => {
      reflector.getAllAndOverride.mockImplementation(() => {
        throw new Error('Reflector error')
      })

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Reflector error'
      )
    })
  })

  describe('Performance Tests', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>
    let mockRequest: any

    beforeEach(() => {
      mockRequest = { user: null }
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any
    })

    it('should perform efficiently with large role sets', () => {
      const largeRoleSet = Array.from({ length: 10000 }, (_, i) => `ROLE_${i}`)
      reflector.getAllAndOverride.mockReturnValue(largeRoleSet)
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['ROLE_5000'],
      } as JwtPayload

      const startTime = performance.now()
      const result = guard.canActivate(mockExecutionContext)
      const endTime = performance.now()

      expect(result).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in less than 100ms
    })

    it('should short-circuit on first matching role', () => {
      reflector.getAllAndOverride.mockReturnValue([
        'FIRST_ROLE',
        'SECOND_ROLE',
        'THIRD_ROLE',
      ])
      mockRequest.user = {
        sub: '1',
        email: 'user@example.com',
        roles: ['FIRST_ROLE'],
      } as JwtPayload

      // Mock the some method to verify short-circuiting behavior
      const originalSome = Array.prototype.some
      let callCount = 0
      Array.prototype.some = function (this: any[], callback: any) {
        return originalSome.call(this, (item: any, index: number) => {
          callCount++
          return callback(item, index)
        })
      }

      const result = guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
      expect(callCount).toBe(1) // Should stop after first match

      Array.prototype.some = originalSome // Restore original method
    })
  })
})

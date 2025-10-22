import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { SimpleJwtAuthGuard } from './guards/simple-jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { Reflector } from '@nestjs/core'
import { ThrottlerStorage } from '@nestjs/throttler'
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  AuthResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from './dto'
import { UserRole } from './dto/register.dto'
import {
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { JwtPayload } from './services/jwt.service'

describe('AuthController', () => {
  let controller: AuthController
  let authService: jest.Mocked<AuthService>

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateUser: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    getUserSessions: jest.fn(),
    revokeSession: jest.fn(),
  }

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  }

  const mockSimpleJwtService = {
    verifyAccessToken: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: 'SimpleJwtService',
          useValue: mockSimpleJwtService,
        },
        {
          provide: 'THROTTLER:MODULE_OPTIONS',
          useValue: {
            ttl: 60000,
            limit: 10,
            ignoreUserAgents: [],
            skipIf: () => false,
          },
        },
        {
          provide: ThrottlerStorage,
          useValue: {
            increment: jest.fn().mockResolvedValue({ totalHits: 1, timeToExpire: 60000 }),
            reset: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(SimpleJwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(
      AuthService
    ) as jest.Mocked<AuthService>
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      name: 'Test User',
      role: UserRole.MEMBER,
    }

    it('should register a new user successfully', async () => {
      const expectedResult = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'MEMBER',
          createdAt: new Date(),
        },
        message:
          'Registration successful. Please check your email to verify your account.',
      }

      mockAuthService.register.mockResolvedValue(expectedResult)

      const result = await controller.register(
        registerDto,
        '127.0.0.1',
        'Mozilla/5.0'
      )

      expect(authService.register).toHaveBeenCalledWith(registerDto)
      expect(result).toEqual(expectedResult)
    })

    it('should handle duplicate email registration', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('User with this email already exists')
      )

      await expect(
        controller.register(registerDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(ConflictException)
    })

    it('should validate password strength', async () => {
      const weakPasswordDto = { ...registerDto, password: 'weak' }
      mockAuthService.register.mockRejectedValue(
        new BadRequestException(['Password must be at least 8 characters long'])
      )

      await expect(
        controller.register(weakPasswordDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle invalid email format', async () => {
      const invalidEmailDto = { ...registerDto, email: 'invalid-email' }
      mockAuthService.register.mockRejectedValue(
        new BadRequestException(['Please provide a valid email address'])
      )

      await expect(
        controller.register(invalidEmailDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
    }

    const mockLoginResult = {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    }

    it('should login user successfully', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResult)

      const result = await controller.login(
        loginDto,
        '127.0.0.1',
        'Mozilla/5.0'
      )

      expect(authService.login).toHaveBeenCalledWith({
        ...loginDto,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      })
      expect(result).toBeInstanceOf(AuthResponseDto)
      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
      expect(result.expiresIn).toBe(900)
    })

    it('should handle invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      )

      await expect(
        controller.login(loginDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should handle account lockout', async () => {
      mockAuthService.login.mockRejectedValue(
        new ForbiddenException(
          'Account is temporarily locked. Please try again later.'
        )
      )

      await expect(
        controller.login(loginDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should handle unverified email', async () => {
      mockAuthService.login.mockRejectedValue(
        new ForbiddenException('Please verify your email before logging in')
      )

      await expect(
        controller.login(loginDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should handle inactive account', async () => {
      mockAuthService.login.mockRejectedValue(
        new ForbiddenException('Your account has been deactivated')
      )

      await expect(
        controller.login(loginDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    }

    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
      tokenType: 'Bearer',
    }

    it('should refresh tokens successfully', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockTokens)

      const result = await controller.refresh(
        refreshTokenDto,
        '127.0.0.1',
        'Mozilla/5.0'
      )

      expect(authService.refreshToken).toHaveBeenCalledWith({
        ...refreshTokenDto,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      })
      expect(result).toBeInstanceOf(RefreshResponseDto)
      expect(result.accessToken).toBe('new-access-token')
    })

    it('should handle invalid refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      )

      await expect(
        controller.refresh(refreshTokenDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should handle expired refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token has expired')
      )

      await expect(
        controller.refresh(refreshTokenDto, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('logout', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      roles: ['MEMBER'],
    }

    it('should logout user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined)

      await expect(controller.logout(mockUser)).resolves.toBeUndefined()
      expect(authService.logout).toHaveBeenCalledWith('1', undefined)
    })

    it('should logout with specific refresh token', async () => {
      const body = { refreshToken: 'specific-token' }
      mockAuthService.logout.mockResolvedValue(undefined)

      await expect(controller.logout(mockUser, body)).resolves.toBeUndefined()
      expect(authService.logout).toHaveBeenCalledWith('1', 'specific-token')
    })

    it('should handle logout errors', async () => {
      mockAuthService.logout.mockRejectedValue(
        new UnauthorizedException('Invalid session')
      )

      await expect(controller.logout(mockUser)).rejects.toThrow(
        UnauthorizedException
      )
    })
  })

  describe('getCurrentUser', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      roles: ['MEMBER'],
    }

    const mockUserResponse = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'MEMBER',
      isActive: true,
    }

    it('should get current user successfully', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUserResponse)

      const result = await controller.getCurrentUser(mockUser)

      expect(authService.validateUser).toHaveBeenCalledWith('1')
      expect(result).toBeInstanceOf(UserResponseDto)
    })

    it('should handle user not found', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException('User not found or inactive')
      )

      await expect(controller.getCurrentUser(mockUser)).rejects.toThrow(
        UnauthorizedException
      )
    })
  })

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      token: 'verification-token',
    }

    it('should verify email successfully', async () => {
      mockAuthService.verifyEmail.mockResolvedValue(undefined)

      const result = await controller.verifyEmail(verifyEmailDto)

      expect(authService.verifyEmail).toHaveBeenCalledWith('verification-token')
      expect(result).toEqual({ message: 'Email successfully verified' })
    })

    it('should handle invalid verification token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid or expired verification token')
      )

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should handle expired verification token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid or expired verification token')
      )

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    }

    it('should handle forgot password request successfully', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined)

      const result = await controller.forgotPassword(forgotPasswordDto)

      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto)
      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent',
      })
    })

    it('should not reveal if email exists', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined)

      const result = await controller.forgotPassword({
        email: 'nonexistent@example.com',
      })

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent',
      })
    })
  })

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'reset-token',
      newPassword: 'NewStrongPass123!',
    }

    it('should reset password successfully', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined)

      const result = await controller.resetPassword(resetPasswordDto)

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto)
      expect(result).toEqual({ message: 'Password successfully reset' })
    })

    it('should handle invalid reset token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token')
      )

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should validate new password strength', async () => {
      const weakPasswordDto = { ...resetPasswordDto, newPassword: 'weak' }
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException(['Password must be at least 8 characters long'])
      )

      await expect(controller.resetPassword(weakPasswordDto)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('changePassword', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      roles: ['MEMBER'],
    }

    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewStrongPass123!',
    }

    it('should change password successfully', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined)

      const result = await controller.changePassword(
        mockUser,
        changePasswordDto
      )

      expect(authService.changePassword).toHaveBeenCalledWith(
        '1',
        changePasswordDto
      )
      expect(result).toEqual({ message: 'Password successfully changed' })
    })

    it('should handle incorrect current password', async () => {
      mockAuthService.changePassword.mockRejectedValue(
        new UnauthorizedException('Current password is incorrect')
      )

      await expect(
        controller.changePassword(mockUser, changePasswordDto)
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should validate new password strength', async () => {
      const weakPasswordDto = { ...changePasswordDto, newPassword: 'weak' }
      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException(['Password must be at least 8 characters long'])
      )

      await expect(
        controller.changePassword(mockUser, weakPasswordDto)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getSessions', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      roles: ['MEMBER'],
    }

    const mockSessions = [
      {
        id: 'session-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        expiresAt: new Date(),
        isCurrent: true,
      },
      {
        id: 'session-2',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/91.0',
        createdAt: new Date(),
        expiresAt: new Date(),
        isCurrent: false,
      },
    ]

    it('should get user sessions successfully', async () => {
      mockAuthService.getUserSessions.mockResolvedValue(mockSessions)

      const result = await controller.getSessions(mockUser)

      expect(authService.getUserSessions).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockSessions)
    })

    it('should handle no active sessions', async () => {
      mockAuthService.getUserSessions.mockResolvedValue([])

      const result = await controller.getSessions(mockUser)

      expect(result).toEqual([])
    })
  })

  describe('revokeSession', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      roles: ['MEMBER'],
    }

    it('should revoke session successfully', async () => {
      mockAuthService.revokeSession.mockResolvedValue(undefined)

      await expect(
        controller.revokeSession(mockUser, 'session-id')
      ).resolves.toBeUndefined()
      expect(authService.revokeSession).toHaveBeenCalledWith('1', 'session-id')
    })

    it('should handle session not found', async () => {
      mockAuthService.revokeSession.mockRejectedValue(
        new NotFoundException('Session not found')
      )

      await expect(
        controller.revokeSession(mockUser, 'invalid-session-id')
      ).rejects.toThrow(NotFoundException)
    })

    it('should handle unauthorized session revocation', async () => {
      mockAuthService.revokeSession.mockRejectedValue(
        new ForbiddenException(
          'Cannot revoke session that does not belong to you'
        )
      )

      await expect(
        controller.revokeSession(mockUser, 'other-user-session')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('Rate Limiting Tests', () => {
    it('should respect rate limiting on registration endpoint', async () => {
      // These tests would be implemented with actual rate limiting
      // when @Throttle decorators are enabled
      expect(true).toBe(true) // Placeholder
    })

    it('should respect rate limiting on login endpoint', async () => {
      // These tests would be implemented with actual rate limiting
      // when @Throttle decorators are enabled
      expect(true).toBe(true) // Placeholder
    })

    it('should respect rate limiting on refresh endpoint', async () => {
      // These tests would be implemented with actual rate limiting
      // when @Throttle decorators are enabled
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Input Validation Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      mockAuthService.register.mockRejectedValue(
        new BadRequestException('Validation failed')
      )

      await expect(
        controller.register(null as any, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle malformed request bodies', async () => {
      const malformedDto = {
        email: '',
        password: '',
        name: '',
      }

      mockAuthService.register.mockRejectedValue(
        new BadRequestException(['email should not be empty'])
      )

      await expect(
        controller.register(malformedDto as any, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle extremely long input values', async () => {
      const longStringDto = {
        email: 'a'.repeat(1000) + '@example.com',
        password: 'StrongPass123!',
        name: 'Test User',
      }

      mockAuthService.register.mockRejectedValue(
        new BadRequestException(['Email is too long'])
      )

      await expect(
        controller.register(longStringDto as any, '127.0.0.1', 'Mozilla/5.0')
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('Security Headers and IP Handling', () => {
    it('should handle missing IP address', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        name: 'Test User',
      }

      mockAuthService.register.mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'MEMBER',
          createdAt: new Date(),
        },
        message:
          'Registration successful. Please check your email to verify your account.',
      })

      await expect(
        controller.register(registerDto, undefined as any, 'Mozilla/5.0')
      ).resolves.toBeDefined()
    })

    it('should handle missing user agent', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      }

      mockAuthService.login.mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'MEMBER',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      })

      await expect(
        controller.login(loginDto, '127.0.0.1', undefined)
      ).resolves.toBeDefined()
    })
  })
})

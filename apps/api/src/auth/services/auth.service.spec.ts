import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import { HashService } from './hash.service'
import { CustomJwtService } from './jwt.service'
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { RegisterDto } from '../dto/register.dto'
import { LoginDto } from '../dto/login.dto'
import { RefreshTokenDto } from '../dto/refresh-token.dto'
import { ChangePasswordDto } from '../dto/change-password.dto'
import { ForgotPasswordDto } from '../dto/forgot-password.dto'
import { ResetPasswordDto } from '../dto/reset-password.dto'
import { UserRole } from '../dto/register.dto'

describe('AuthService', () => {
  let service: AuthService
  let prismaService: jest.Mocked<PrismaService>
  let hashService: jest.Mocked<HashService>
  let jwtService: jest.Mocked<CustomJwtService>

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  }

  const mockHashService = {
    validatePasswordStrength: jest.fn(),
    hashPassword: jest.fn(),
    comparePasswords: jest.fn(),
    generateSecureToken: jest.fn(),
    hashResetToken: jest.fn(),
    verifyResetToken: jest.fn(),
  }

  const mockJwtService = {
    generateTokenPair: jest.fn(),
    verifyRefreshToken: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    // Set up environment variables for testing
    process.env.MAX_LOGIN_ATTEMPTS = '5'
    process.env.LOCKOUT_DURATION = '1800000' // 30 minutes

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
        {
          provide: CustomJwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prismaService = module.get<PrismaService>(
      PrismaService
    ) as jest.Mocked<PrismaService>
    hashService = module.get<HashService>(
      HashService
    ) as jest.Mocked<HashService>
    jwtService = module.get<CustomJwtService>(
      CustomJwtService
    ) as jest.Mocked<CustomJwtService>
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      name: 'Test User',
      role: UserRole.MEMBER,
    }

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'MEMBER',
      createdAt: new Date(),
    }

    beforeEach(() => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockHashService.hashPassword.mockResolvedValue('hashed-password')
      mockHashService.generateSecureToken.mockReturnValue('verification-token')
      mockHashService.hashResetToken.mockResolvedValue(
        'hashed-verification-token'
      )
    })

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.user.create.mockResolvedValue(mockUser)
      mockPrismaService.verificationToken.create.mockResolvedValue({
        id: '1',
        userId: '1',
        token: 'hashed-verification-token',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      })

      const result = await service.register(registerDto)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(hashService.validatePasswordStrength).toHaveBeenCalledWith(
        'StrongPass123!'
      )
      expect(hashService.hashPassword).toHaveBeenCalledWith('StrongPass123!')
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashed-password',
          role: 'MEMBER',
          emailVerified: false,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })
      expect(result.user).toEqual(mockUser)
      expect(result.message).toBe(
        'Registration successful. Please check your email to verify your account.'
      )
    })

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('User with this email already exists')
      )
    })

    it('should throw BadRequestException for weak password', async () => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException(['Password must be at least 8 characters long'])
      )
    })

    it('should default to MEMBER role if none provided', async () => {
      const dtoWithoutRole = { ...registerDto }
      delete dtoWithoutRole.role

      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.user.create.mockResolvedValue(mockUser)
      mockPrismaService.verificationToken.create.mockResolvedValue({} as any)

      await service.register(dtoWithoutRole)

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'MEMBER',
          }),
        })
      )
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      role: 'MEMBER',
      emailVerified: true,
      isActive: true,
      lockedUntil: null,
      loginAttempts: [],
    }

    const mockTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      tokenType: 'Bearer',
    }

    beforeEach(() => {
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockHashService.hashResetToken.mockResolvedValue('hashed-refresh-token')
      mockJwtService.generateTokenPair.mockResolvedValue(mockTokens)
    })

    it('should login user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrismaService.loginAttempt.create.mockResolvedValue({} as any)
      mockPrismaService.user.update.mockResolvedValue(mockUser as any)
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any)

      const result = await service.login(loginDto)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          loginAttempts: {
            where: {
              createdAt: {
                gte: expect.any(Date),
              },
            },
          },
        },
      })
      expect(hashService.comparePasswords).toHaveBeenCalledWith(
        'StrongPass123!',
        'hashed-password'
      )
      expect(result.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
      })
      expect(result.tokens).toEqual(mockTokens)
    })

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      )
    })

    it('should throw ForbiddenException for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 1000000), // Future date
      }
      mockPrismaService.user.findUnique.mockResolvedValue(lockedUser as any)

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException(
          'Account is temporarily locked. Please try again later.'
        )
      )
    })

    it('should lock account after max failed attempts', async () => {
      const userWithFailedAttempts = {
        ...mockUser,
        loginAttempts: Array(5).fill({ successful: false }),
      }
      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithFailedAttempts as any
      )

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException(
          'Too many failed attempts. Account has been locked.'
        )
      )
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          lockedUntil: expect.any(Date),
        },
      })
    })

    it('should log failed attempt for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.comparePasswords.mockResolvedValue(false)

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      )
      expect(prismaService.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          successful: false,
        },
      })
    })

    it('should throw ForbiddenException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false }
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser as any)

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException('Please verify your email before logging in')
      )
    })

    it('should throw ForbiddenException for inactive account', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser as any)

      await expect(service.login(loginDto)).rejects.toThrow(
        new ForbiddenException('Your account has been deactivated')
      )
    })

    it('should clear lockout on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrismaService.loginAttempt.create.mockResolvedValue({} as any)
      mockPrismaService.user.update.mockResolvedValue(mockUser as any)
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any)

      await service.login(loginDto)

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          lastLoginAt: expect.any(Date),
          loginCount: { increment: 1 },
          lockedUntil: null,
        },
      })
    })
  })

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    const mockPayload = {
      sub: '1',
      tokenId: 'token-id',
    }

    const mockStoredToken = {
      id: 'stored-token-id',
      userId: '1',
      token: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      revokedAt: null,
    }

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'MEMBER',
      isActive: true,
    }

    const mockNewTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
      tokenType: 'Bearer',
    }

    beforeEach(() => {
      mockJwtService.verifyRefreshToken.mockResolvedValue(mockPayload as any)
      mockHashService.verifyResetToken.mockResolvedValue(true)
      mockHashService.hashResetToken.mockResolvedValue(
        'new-hashed-refresh-token'
      )
      mockJwtService.generateTokenPair.mockResolvedValue(mockNewTokens)
    })

    it('should refresh tokens successfully', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([
        mockStoredToken,
      ] as any)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any)
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any)

      const result = await service.refreshToken(refreshTokenDto)

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token'
      )
      expect(prismaService.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
          expiresAt: { gte: expect.any(Date) },
          revokedAt: null,
        },
      })
      expect(hashService.verifyResetToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        'hashed-token'
      )
      expect(result).toEqual(mockNewTokens)
    })

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      )

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      )
    })

    it('should throw UnauthorizedException when no matching stored token found', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([])

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      )
    })

    it('should throw UnauthorizedException when token hash verification fails', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([
        mockStoredToken,
      ] as any)
      mockHashService.verifyResetToken.mockResolvedValue(false)

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      )
    })

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([
        mockStoredToken,
      ] as any)
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser as any)

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive')
      )
    })

    it('should revoke old refresh token', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([
        mockStoredToken,
      ] as any)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any)
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any)

      await service.refreshToken(refreshTokenDto)

      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'stored-token-id' },
        data: { revokedAt: expect.any(Date) },
      })
    })
  })

  describe('logout', () => {
    const userId = '1'
    const refreshToken = 'refresh-token'

    const mockStoredTokens = [
      {
        id: 'token1',
        token: 'hashed-token1',
        revokedAt: null,
      },
      {
        id: 'token2',
        token: 'hashed-token2',
        revokedAt: null,
      },
    ]

    it('should logout and revoke specific refresh token', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue(
        mockStoredTokens as any
      )
      mockHashService.verifyResetToken
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any)

      await service.logout(userId, refreshToken)

      expect(prismaService.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
        },
      })
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token2' },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should logout and revoke all refresh tokens when no specific token provided', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({} as any)

      await service.logout(userId)

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should handle logout when no matching token is found', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue(
        mockStoredTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(false)

      // Should not throw error
      await expect(
        service.logout(userId, refreshToken)
      ).resolves.toBeUndefined()
    })
  })

  describe('verifyEmail', () => {
    const token = 'verification-token'

    const mockVerificationTokens = [
      {
        id: 'vtoken1',
        token: 'hashed-vtoken1',
        userId: '1',
        expiresAt: new Date(Date.now() + 1000000),
        usedAt: null,
        user: { id: '1', email: 'test@example.com' },
      },
    ]

    it('should verify email successfully', async () => {
      mockPrismaService.verificationToken.findMany.mockResolvedValue(
        mockVerificationTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(true)
      mockPrismaService.verificationToken.update.mockResolvedValue({} as any)
      mockPrismaService.user.update.mockResolvedValue({} as any)

      await service.verifyEmail(token)

      expect(prismaService.verificationToken.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { gte: expect.any(Date) },
          usedAt: null,
        },
        include: { user: true },
      })
      expect(hashService.verifyResetToken).toHaveBeenCalledWith(
        token,
        'hashed-vtoken1'
      )
      expect(prismaService.verificationToken.update).toHaveBeenCalledWith({
        where: { id: 'vtoken1' },
        data: { usedAt: expect.any(Date) },
      })
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { emailVerified: true },
      })
    })

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.verificationToken.findMany.mockResolvedValue(
        mockVerificationTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(false)

      await expect(service.verifyEmail(token)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification token')
      )
    })

    it('should throw BadRequestException when no valid tokens found', async () => {
      mockPrismaService.verificationToken.findMany.mockResolvedValue([])

      await expect(service.verifyEmail(token)).rejects.toThrow(
        new BadRequestException('Invalid or expired verification token')
      )
    })
  })

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    }

    const mockUser = {
      id: '1',
      email: 'test@example.com',
    }

    it('should create password reset token for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.generateSecureToken.mockReturnValue('reset-token')
      mockHashService.hashResetToken.mockResolvedValue('hashed-reset-token')
      mockPrismaService.passwordResetToken.create.mockResolvedValue({} as any)

      await service.forgotPassword(forgotPasswordDto)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(hashService.generateSecureToken).toHaveBeenCalled()
      expect(prismaService.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          token: 'hashed-reset-token',
          expiresAt: expect.any(Date),
        },
      })
    })

    it('should not reveal if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      // Should not throw error
      await expect(
        service.forgotPassword(forgotPasswordDto)
      ).resolves.toBeUndefined()
      expect(prismaService.passwordResetToken.create).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'reset-token',
      newPassword: 'NewStrongPass123!',
    }

    const mockResetTokens = [
      {
        id: 'rtoken1',
        token: 'hashed-rtoken1',
        userId: '1',
        expiresAt: new Date(Date.now() + 1000000),
        usedAt: null,
        user: { id: '1', email: 'test@example.com' },
      },
    ]

    beforeEach(() => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockHashService.hashPassword.mockResolvedValue('new-hashed-password')
    })

    it('should reset password successfully', async () => {
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue(
        mockResetTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(true)
      mockPrismaService.user.update.mockResolvedValue({} as any)
      mockPrismaService.passwordResetToken.update.mockResolvedValue({} as any)
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({} as any)

      await service.resetPassword(resetPasswordDto)

      expect(hashService.verifyResetToken).toHaveBeenCalledWith(
        'reset-token',
        'hashed-rtoken1'
      )
      expect(hashService.validatePasswordStrength).toHaveBeenCalledWith(
        'NewStrongPass123!'
      )
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'new-hashed-password' },
      })
      expect(prismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'rtoken1' },
        data: { usedAt: expect.any(Date) },
      })
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should throw BadRequestException for invalid reset token', async () => {
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue(
        mockResetTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(false)

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException('Invalid or expired reset token')
      )
    })

    it('should throw BadRequestException for weak new password', async () => {
      mockPrismaService.passwordResetToken.findMany.mockResolvedValue(
        mockResetTokens as any
      )
      mockHashService.verifyResetToken.mockResolvedValue(true)
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        new BadRequestException(['Password must be at least 8 characters long'])
      )
    })
  })

  describe('changePassword', () => {
    const userId = '1'
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewStrongPass123!',
    }

    const mockUser = {
      id: '1',
      password: 'old-hashed-password',
    }

    beforeEach(() => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockHashService.hashPassword.mockResolvedValue('new-hashed-password')
    })

    it('should change password successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockPrismaService.user.update.mockResolvedValue({} as any)
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({} as any)

      await service.changePassword(userId, changePasswordDto)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      })
      expect(hashService.comparePasswords).toHaveBeenCalledWith(
        'OldPass123!',
        'old-hashed-password'
      )
      expect(hashService.validatePasswordStrength).toHaveBeenCalledWith(
        'NewStrongPass123!'
      )
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'new-hashed-password' },
      })
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.changePassword(userId, changePasswordDto)
      ).rejects.toThrow(new NotFoundException('User not found'))
    })

    it('should throw UnauthorizedException for incorrect current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.comparePasswords.mockResolvedValue(false)

      await expect(
        service.changePassword(userId, changePasswordDto)
      ).rejects.toThrow(
        new UnauthorizedException('Current password is incorrect')
      )
    })

    it('should throw BadRequestException for weak new password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must contain at least one special character'],
      })

      await expect(
        service.changePassword(userId, changePasswordDto)
      ).rejects.toThrow(
        new BadRequestException([
          'Password must contain at least one special character',
        ])
      )
    })
  })

  describe('validateUser', () => {
    const userId = '1'

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'MEMBER',
      isActive: true,
    }

    it('should validate user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)

      const result = await service.validateUser(userId)

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      })
      expect(result).toEqual(mockUser)
    })

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.validateUser(userId)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive')
      )
    })

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser as any)

      await expect(service.validateUser(userId)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive')
      )
    })
  })

  describe('getUserSessions', () => {
    const userId = '1'

    const mockSessions = [
      {
        id: 'session1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2023-01-01'),
        expiresAt: new Date('2023-01-08'),
      },
      {
        id: 'session2',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/91.0',
        createdAt: new Date('2023-01-02'),
        expiresAt: new Date('2023-01-09'),
      },
    ]

    it('should get user sessions successfully', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue(
        mockSessions as any
      )

      const result = await service.getUserSessions(userId)

      expect(prismaService.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gte: expect.any(Date) },
        },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        ...mockSessions[0],
        isCurrent: false,
      })
    })

    it('should return empty array when no sessions found', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([])

      const result = await service.getUserSessions(userId)

      expect(result).toEqual([])
    })
  })

  describe('revokeSession', () => {
    const userId = '1'
    const sessionId = 'session-id'

    const mockSession = {
      id: sessionId,
      userId,
      revokedAt: null,
    }

    it('should revoke session successfully', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(
        mockSession as any
      )
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any)

      await service.revokeSession(userId, sessionId)

      expect(prismaService.refreshToken.findFirst).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
        },
      })
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should throw NotFoundException for non-existent session', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null)

      await expect(service.revokeSession(userId, sessionId)).rejects.toThrow(
        new NotFoundException('Session not found')
      )
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle database connection errors gracefully', async () => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'StrongPass123!',
          name: 'Test User',
        })
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle hash service errors gracefully', async () => {
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockHashService.hashPassword.mockRejectedValue(
        new Error('Hashing failed')
      )
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'StrongPass123!',
          name: 'Test User',
        })
      ).rejects.toThrow('Hashing failed')
    })

    it('should handle JWT service errors gracefully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      }

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'MEMBER',
        emailVerified: true,
        isActive: true,
        lockedUntil: null,
        loginAttempts: [],
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser as any)
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockJwtService.generateTokenPair.mockRejectedValue(
        new Error('JWT generation failed')
      )

      await expect(service.login(loginDto)).rejects.toThrow(
        'JWT generation failed'
      )
    })
  })
})

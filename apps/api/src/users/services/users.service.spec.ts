import { Test, TestingModule } from '@nestjs/testing'
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../../prisma/prisma.service'
import { HashService } from '../../auth/services/hash.service'
import { FileStorageService } from './file-storage.service'
import { UserRole } from '@prisma/client'

describe('UsersService', () => {
  let service: UsersService
  let prismaService: jest.Mocked<PrismaService>
  let hashService: jest.Mocked<HashService>

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    loginAttempt: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }

  const mockHashService = {
    hashPassword: jest.fn(),
    comparePasswords: jest.fn(),
    validatePasswordStrength: jest.fn(),
  }

  const mockFileStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    avatar: null,
    role: UserRole.MEMBER,
    emailVerified: true,
    isActive: true,
    lastLoginAt: new Date(),
    loginCount: 5,
    lockedUntil: null,
    workingHours: JSON.stringify({ start: '09:00', end: '17:00' }),
    timeZone: 'America/New_York',
    notificationPrefs: JSON.stringify({ email: true, push: false }),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    prismaService = module.get(PrismaService)
    hashService = module.get(HashService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getUserProfile', () => {
    it('should successfully get user profile by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.getUserProfile('user-123')

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          password: false,
        }),
      })
      expect(result).toBeDefined()
      expect(result.id).toBe('user-123')
      expect(result).not.toHaveProperty('password')
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.getUserProfile('non-existent')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw NotFoundException for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      })

      await expect(service.getUserProfile('user-123')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('updateUserProfile', () => {
    const updateDto = {
      name: 'Updated Name',
      timeZone: 'Europe/London',
      workingHours: { start: '08:00', end: '16:00' },
    }

    it('should successfully update user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      })

      const result = await service.updateUserProfile('user-123', updateDto)

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          name: 'Updated Name',
          timeZone: 'Europe/London',
        }),
        select: expect.any(Object),
      })
      expect(result.name).toBe('Updated Name')
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.updateUserProfile('non-existent', updateDto)
      ).rejects.toThrow(NotFoundException)
    })

    it('should validate email format when updating', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      await expect(
        service.updateUserProfile('user-123', { email: 'invalid-email' })
      ).rejects.toThrow(BadRequestException)
    })

    it('should not allow updating immutable fields', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.updateUserProfile('user-123', {
        role: UserRole.ADMIN, // Should be filtered out
        emailVerified: true, // Should be filtered out
      } as any)

      expect(prismaService.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: expect.anything(),
            emailVerified: expect.anything(),
          }),
        })
      )
    })
  })

  describe('updateAvatar', () => {
    const mockFile = {
      fieldname: 'avatar',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 50000,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File

    it('should successfully upload avatar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        avatar: 'avatar-url',
      })

      const result = await service.updateAvatar('user-123', mockFile)

      expect(result).toHaveProperty('avatar')
      expect(prismaService.user.update).toHaveBeenCalled()
    })

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/exe',
      }

      await expect(
        service.updateAvatar('user-123', invalidFile)
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for oversized file', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      }

      await expect(service.updateAvatar('user-123', largeFile)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.updateAvatar('non-existent', mockFile)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('changePassword', () => {
    const passwordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    }

    it('should successfully change password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockHashService.hashPassword.mockResolvedValue('new-hashed-password')

      await service.changePassword('user-123', passwordDto)

      expect(hashService.comparePasswords).toHaveBeenCalledWith(
        'OldPassword123!',
        'hashed-password'
      )
      expect(hashService.validatePasswordStrength).toHaveBeenCalledWith(
        'NewPassword123!'
      )
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'new-hashed-password' },
      })
    })

    it('should throw UnauthorizedException for incorrect current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockHashService.comparePasswords.mockResolvedValue(false)

      await expect(
        service.changePassword('user-123', passwordDto)
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw BadRequestException for weak new password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockHashService.comparePasswords.mockResolvedValue(true)
      mockHashService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'OldPassword123!',
          newPassword: 'weak',
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.changePassword('non-existent', passwordDto)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getActivityLog', () => {
    const mockActivityLog = [
      {
        id: 'attempt-1',
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        successful: true,
        createdAt: new Date(),
      },
      {
        id: 'attempt-2',
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/91.0',
        successful: false,
        createdAt: new Date(),
      },
    ]

    it('should successfully get user activity log', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.loginAttempt.findMany.mockResolvedValue(mockActivityLog)

      const result = await service.getActivityLog('user-123')

      expect(prismaService.loginAttempt.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('successful', true)
    })

    it('should return empty array for user with no activity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.loginAttempt.findMany.mockResolvedValue([])

      const result = await service.getActivityLog('user-123')

      expect(result).toEqual([])
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.getActivityLog('non-existent')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should limit activity log results', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.loginAttempt.findMany.mockResolvedValue(mockActivityLog)

      await service.getActivityLog('user-123', 10)

      expect(prismaService.loginAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      )
    })
  })

  describe('Authorization', () => {
    it('should allow user to access their own profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      await expect(
        service.getUserProfile('user-123', 'user-123')
      ).resolves.toBeDefined()
    })

    it('should prevent user from accessing another user profile', async () => {
      await expect(
        service.getUserProfile('user-123', 'different-user')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should allow admin to access any user profile', async () => {
      const adminUser = {
        ...mockUser,
        id: 'admin-123',
        role: UserRole.ADMIN,
      }
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(mockUser)

      await expect(
        service.getUserProfile('user-123', 'admin-123', UserRole.ADMIN)
      ).resolves.toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(service.getUserProfile('user-123')).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle malformed user ID', async () => {
      await expect(service.getUserProfile('')).rejects.toThrow()
    })

    it('should validate JSON fields', async () => {
      const invalidDto = {
        workingHours: 'invalid-json',
      }

      await expect(
        service.updateUserProfile('user-123', invalidDto as any)
      ).rejects.toThrow(BadRequestException)
    })
  })
})

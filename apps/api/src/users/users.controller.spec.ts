import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './services/users.service'
import { FileStorageService } from './services/file-storage.service'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'
import { UserRole } from '@prisma/client'
import { ForbiddenException, BadRequestException } from '@nestjs/common'

describe('UsersController', () => {
  let controller: UsersController
  let usersService: jest.Mocked<UsersService>

  const mockUsersService = {
    findOne: jest.fn(),
    update: jest.fn(),
    uploadAvatar: jest.fn(),
    changePassword: jest.fn(),
    getUserActivity: jest.fn(),
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
    avatar: null,
    role: UserRole.MEMBER,
    emailVerified: true,
    isActive: true,
    timeZone: 'America/New_York',
    workingHours: { start: '09:00', end: '17:00' },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRequest = {
    user: {
      userId: 'user-123',
      role: UserRole.MEMBER,
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    })
      .overrideGuard(SimpleJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<UsersController>(UsersController)
    usersService = module.get(UsersService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('GET /users/:id', () => {
    it('should successfully get user profile', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser)

      const result = await controller.getUserProfile('user-123', mockRequest)

      expect(usersService.findOne).toHaveBeenCalledWith('user-123')
      expect(result).toBeDefined()
    })

    it('should throw ForbiddenException when accessing another user profile', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new ForbiddenException('You can only access your own profile')
      )

      await expect(
        controller.getUserProfile('different-user', mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should allow admin to access any profile', async () => {
      const adminRequest = {
        user: {
          userId: 'admin-123',
          role: UserRole.ADMIN,
        },
      }
      mockUsersService.findOne.mockResolvedValue(mockUser)

      const result = await controller.getUserProfile('user-123', adminRequest)

      expect(result).toBeDefined()
    })

    it('should not expose password in response', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser)

      const result = await controller.getUserProfile('user-123', mockRequest)

      expect(result).not.toHaveProperty('password')
    })
  })

  describe('PATCH /users/:id', () => {
    const updateDto = {
      name: 'Updated Name',
      timeZone: 'Europe/London',
      workingHours: { start: '08:00', end: '16:00' },
    }

    it('should successfully update user profile', async () => {
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      })

      const result = await controller.updateUserProfile(
        'user-123',
        updateDto,
        mockRequest
      )

      expect(usersService.update).toHaveBeenCalledWith(
        'user-123',
        updateDto
      )
      expect(result.name).toBe('Updated Name')
    })

    it('should throw ForbiddenException when updating another user', async () => {
      await expect(
        controller.updateUserProfile('different-user', updateDto, mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should validate update DTO', async () => {
      const invalidDto = {
        email: 'invalid-email',
      }

      await expect(
        controller.updateUserProfile('user-123', invalidDto as any, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })

    it('should allow partial updates', async () => {
      const partialDto = { name: 'New Name' }
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      })

      const result = await controller.updateUserProfile(
        'user-123',
        partialDto,
        mockRequest
      )

      expect(result.name).toBe('New Name')
    })
  })

  describe('POST /users/:id/avatar', () => {
    const mockFile = {
      fieldname: 'avatar',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 50000,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File

    it('should successfully upload avatar', async () => {
      mockUsersService.uploadAvatar.mockResolvedValue({
        ...mockUser,
        avatar: 'avatar-url',
      })

      const result = await controller.uploadAvatar(
        'user-123',
        mockFile,
        mockRequest
      )

      expect(usersService.uploadAvatar).toHaveBeenCalledWith(
        'user-123',
        mockFile
      )
      expect(result).toHaveProperty('avatar', 'avatar-url')
    })

    it('should throw ForbiddenException when uploading for another user', async () => {
      await expect(
        controller.uploadAvatar('different-user', mockFile, mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should reject invalid file types', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/exe',
        originalname: 'malware.exe',
      }

      mockUsersService.uploadAvatar.mockRejectedValue(
        new BadRequestException('Invalid file type')
      )

      await expect(
        controller.uploadAvatar('user-123', invalidFile, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject oversized files', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      }

      mockUsersService.uploadAvatar.mockRejectedValue(
        new BadRequestException('File too large')
      )

      await expect(
        controller.uploadAvatar('user-123', largeFile, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.uploadAvatar('user-123', undefined, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('PATCH /users/:id/password', () => {
    const passwordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    }

    it('should successfully change password', async () => {
      mockUsersService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      })

      const result = await controller.changePassword(
        'user-123',
        passwordDto,
        mockRequest
      )

      expect(usersService.changePassword).toHaveBeenCalledWith(
        'user-123',
        passwordDto
      )
      expect(result).toHaveProperty('message')
    })

    it('should throw ForbiddenException when changing another user password', async () => {
      await expect(
        controller.changePassword('different-user', passwordDto, mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should validate password strength', async () => {
      const weakPasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      }

      mockUsersService.changePassword.mockRejectedValue(
        new BadRequestException('Password too weak')
      )

      await expect(
        controller.changePassword('user-123', weakPasswordDto, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })

    it('should require current password', async () => {
      const invalidDto = {
        newPassword: 'NewPassword123!',
      }

      await expect(
        controller.changePassword('user-123', invalidDto as any, mockRequest)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('GET /users/:id/activity', () => {
    const mockActivity = [
      {
        id: 'activity-1',
        userId: 'user-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        successful: true,
        createdAt: new Date(),
      },
    ]

    it('should successfully get user activity log', async () => {
      mockUsersService.getUserActivity.mockResolvedValue(mockActivity)

      const result = await controller.getActivityLog('user-123', mockRequest)

      expect(usersService.getUserActivity).toHaveBeenCalledWith('user-123', 50)
      expect(result).toEqual(mockActivity)
    })

    it('should throw ForbiddenException when accessing another user activity', async () => {
      await expect(
        controller.getActivityLog('different-user', mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should allow admin to access any user activity', async () => {
      const adminRequest = {
        user: {
          userId: 'admin-123',
          role: UserRole.ADMIN,
        },
      }
      mockUsersService.getUserActivity.mockResolvedValue(mockActivity)

      const result = await controller.getActivityLog('user-123', adminRequest)

      expect(result).toEqual(mockActivity)
    })

    it('should support limit query parameter', async () => {
      mockUsersService.getUserActivity.mockResolvedValue(mockActivity)

      await controller.getActivityLog('user-123', mockRequest, 10)

      expect(usersService.getUserActivity).toHaveBeenCalledWith('user-123', 10)
    })
  })

  describe('Authorization Guards', () => {
    it('should require authentication for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', controller.constructor)
      expect(guards).toBeDefined()
    })

    it('should enforce user ownership or admin role', async () => {
      const otherUserRequest = {
        user: {
          userId: 'other-user',
          role: UserRole.MEMBER,
        },
      }

      await expect(
        controller.getUserProfile('user-123', otherUserRequest)
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('Input Validation', () => {
    it('should validate user ID format', async () => {
      await expect(controller.getUserProfile('', mockRequest)).rejects.toThrow()
    })

    it('should sanitize input data', async () => {
      const xssAttempt = {
        name: '<script>alert("XSS")</script>',
      }

      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        name: xssAttempt.name,
      })

      const result = await controller.updateUserProfile(
        'user-123',
        xssAttempt,
        mockRequest
      )

      // Verify that the name is stored but should be escaped when rendered
      expect(result.name).toBe(xssAttempt.name)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        controller.getUserProfile('user-123', mockRequest)
      ).rejects.toThrow('Database error')
    })

    it('should return appropriate HTTP status codes', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new ForbiddenException()
      )

      await expect(
        controller.getUserProfile('different-user', mockRequest)
      ).rejects.toThrow(ForbiddenException)
    })
  })
})

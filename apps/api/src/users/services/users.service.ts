import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { FileStorageService } from './file-storage.service'
import * as bcrypt from 'bcrypt'
import {
  UpdateUserDto,
  ChangePasswordDto,
  UserActivityDto,
  ActivityType,
} from '../dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService
  ) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timeZone: true,
        workingHours: true,
        notificationPrefs: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    return user
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    // Verify user exists
    await this.findOne(userId)

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timeZone: true,
        workingHours: true,
        notificationPrefs: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  async uploadAvatar(userId: string, file: any) {
    // Verify user exists
    const user = await this.findOne(userId)

    // Delete old avatar if exists
    if (user.avatar) {
      await this.fileStorageService.deleteAvatar(user.avatar)
    }

    // Save new avatar
    const uploadResult = await this.fileStorageService.saveAvatar(file, userId)

    // Update user record with new avatar path
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadResult.path },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timeZone: true,
        workingHours: true,
        notificationPrefs: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return updatedUser
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password
    )

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect')
    }

    // Check if new password is different from old password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password
    )

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password'
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10)

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })
  }

  async getUserActivity(userId: string): Promise<UserActivityDto[]> {
    // Verify user exists
    await this.findOne(userId)

    // Get login attempts (last 50)
    const loginAttempts = await this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Convert login attempts to activity DTOs
    const activities: UserActivityDto[] = loginAttempts.map((attempt) => {
      return new UserActivityDto({
        id: attempt.id,
        type: ActivityType.LOGIN,
        description: attempt.successful
          ? `Successful login from ${attempt.ipAddress || 'unknown IP'}`
          : `Failed login attempt from ${attempt.ipAddress || 'unknown IP'}`,
        ipAddress: attempt.ipAddress || undefined,
        userAgent: attempt.userAgent || undefined,
        successful: attempt.successful,
        createdAt: attempt.createdAt,
      })
    })

    return activities
  }
}

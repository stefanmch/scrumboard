import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { UsersService } from './services/users.service'
import { FileStorageService } from './services/file-storage.service'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'
import { UserAuthorizationGuard } from './guards/user-authorization.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import {
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
  UserActivityDto,
} from './dto'
import type { JwtPayload } from '../auth/services/simple-jwt.service'

@ApiTags('users')
@Controller('users')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fileStorageService: FileStorageService
  ) {}

  @Get(':id')
  @UseGuards(UserAuthorizationGuard)
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own profile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(
    @Param('id') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<UserResponseDto> {
    const userProfile = await this.usersService.findOne(userId)
    return new UserResponseDto(userProfile)
  }

  @Patch(':id')
  @UseGuards(UserAuthorizationGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own profile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateUserProfile(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(userId, updateUserDto)
    return new UserResponseDto(updatedUser)
  }

  @Post(':id/avatar')
  @UseGuards(UserAuthorizationGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg']
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new Error('Invalid file type. Only JPG and PNG are allowed'),
            false
          )
        }
        callback(null, true)
      },
    })
  )
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (max 5MB, JPG or PNG only)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own avatar',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async uploadAvatar(
    @Param('id') userId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: JwtPayload
  ): Promise<UserResponseDto> {
    // Validate file
    this.fileStorageService.validateFile(file)

    // Upload avatar and update user
    const updatedUser = await this.usersService.uploadAvatar(userId, file)
    return new UserResponseDto(updatedUser)
  }

  @Patch(':id/password')
  @UseGuards(UserAuthorizationGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or password requirements not met',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only change own password',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async changePassword(
    @Param('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(userId, changePasswordDto)
    return { message: 'Password changed successfully' }
  }

  @Get(':id/activity')
  @UseGuards(UserAuthorizationGuard)
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiResponse({
    status: 200,
    description: 'User activity log retrieved successfully',
    type: [UserActivityDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own activity',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserActivity(
    @Param('id') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<UserActivityDto[]> {
    return this.usersService.getUserActivity(userId)
  }
}

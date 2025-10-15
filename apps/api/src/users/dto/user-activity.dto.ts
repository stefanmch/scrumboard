import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

export enum ActivityType {
  LOGIN = 'login',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change',
  AVATAR_UPLOAD = 'avatar_upload',
}

export class UserActivityDto {
  @ApiProperty({
    description: 'Activity ID',
    example: 'cm4rcxxb20000xqiw2ofsphwl',
    type: String,
  })
  @Expose()
  id: string

  @ApiProperty({
    description: 'Activity type',
    enum: ActivityType,
    example: ActivityType.LOGIN,
  })
  @Expose()
  type: ActivityType

  @ApiProperty({
    description: 'Activity description',
    example: 'Successful login from 192.168.1.1',
    type: String,
  })
  @Expose()
  description: string

  @ApiProperty({
    description: 'IP address where activity originated',
    example: '192.168.1.1',
    type: String,
    required: false,
  })
  @Expose()
  ipAddress?: string

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0...',
    type: String,
    required: false,
  })
  @Expose()
  userAgent?: string

  @ApiProperty({
    description: 'Whether the activity was successful',
    example: true,
    type: Boolean,
  })
  @Expose()
  successful: boolean

  @ApiProperty({
    description: 'Timestamp of the activity',
    example: '2025-10-15T10:30:00Z',
    type: Date,
  })
  @Expose()
  createdAt: Date

  constructor(partial: Partial<UserActivityDto>) {
    Object.assign(this, partial)
  }
}

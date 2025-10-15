import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { UserRole } from '@prisma/client'

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'cm4rcxxb20000xqiw2ofsphwl',
    type: String,
  })
  @Expose()
  id: string

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @Expose()
  email: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    type: String,
  })
  @Expose()
  name: string

  @ApiProperty({
    description: 'User avatar URL',
    example: '/uploads/avatars/user123.jpg',
    type: String,
    required: false,
  })
  @Expose()
  avatar?: string | null

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.DEVELOPER,
  })
  @Expose()
  role: UserRole

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York',
    type: String,
    required: false,
  })
  @Expose()
  timeZone?: string | null

  @ApiProperty({
    description: 'Working hours configuration (JSON string)',
    example: '{"start": "09:00", "end": "17:00"}',
    type: String,
    required: false,
  })
  @Expose()
  workingHours?: string | null

  @ApiProperty({
    description: 'Notification preferences (JSON string)',
    example: '{"email": true, "push": false, "inApp": true}',
    type: String,
    required: false,
  })
  @Expose()
  notificationPrefs?: string | null

  @ApiProperty({
    description: 'Whether email has been verified',
    example: true,
    type: Boolean,
  })
  @Expose()
  emailVerified: boolean

  @ApiProperty({
    description: 'Whether account is active',
    example: true,
    type: Boolean,
  })
  @Expose()
  isActive: boolean

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-10-15T10:30:00Z',
    type: Date,
    required: false,
  })
  @Expose()
  lastLoginAt?: Date | null

  @ApiProperty({
    description: 'Total login count',
    example: 42,
    type: Number,
  })
  @Expose()
  loginCount: number

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-10-15T10:30:00Z',
    type: Date,
  })
  @Expose()
  createdAt: Date

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-10-15T10:30:00Z',
    type: Date,
  })
  @Expose()
  updatedAt: Date

  @Exclude()
  password: string

  @Exclude()
  lockedUntil: Date

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial)
  }
}

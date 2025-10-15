import { Exclude, Expose } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from './register.dto'

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
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.DEVELOPER,
  })
  @Expose()
  role: UserRole

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
  passwordResetToken: string

  @Exclude()
  passwordResetExpires: Date

  @Exclude()
  emailVerificationToken: string

  @Exclude()
  refreshTokens: any[]

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial)
  }
}

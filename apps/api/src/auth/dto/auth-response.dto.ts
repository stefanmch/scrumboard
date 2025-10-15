import { Expose } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { UserResponseDto } from './user-response.dto'

export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  @Expose()
  user: UserResponseDto

  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @Expose()
  accessToken: string

  @ApiProperty({
    description: 'Refresh token to get new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @Expose()
  refreshToken: string

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
    type: Number,
  })
  @Expose()
  expiresIn: number

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    type: String,
    default: 'Bearer',
  })
  @Expose()
  tokenType: string = 'Bearer'

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial)
  }
}

export class RefreshResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @Expose()
  accessToken: string

  @ApiProperty({
    description: 'New refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @Expose()
  refreshToken: string

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
    type: Number,
  })
  @Expose()
  expiresIn: number

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    type: String,
    default: 'Bearer',
  })
  @Expose()
  tokenType: string = 'Bearer'

  constructor(partial: Partial<RefreshResponseDto>) {
    Object.assign(this, partial)
  }
}

import { IsEmail, IsString, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  password: string

  @ApiPropertyOptional({
    description: 'IP address of the client (auto-populated)',
    example: '192.168.1.1',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string

  @ApiPropertyOptional({
    description: 'User agent string (auto-populated)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  userAgent?: string
}

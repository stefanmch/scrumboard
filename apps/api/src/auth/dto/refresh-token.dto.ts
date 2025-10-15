import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token received from login or previous refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string

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

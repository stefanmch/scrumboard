import { IsString, IsOptional } from 'class-validator'

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string

  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string

  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  userAgent?: string
}

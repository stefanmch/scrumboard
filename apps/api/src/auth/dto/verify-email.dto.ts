import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token from registration email',
    example: 'abc123def456ghi789',
    type: String,
  })
  @IsString({ message: 'Token must be a string' })
  token: string
}

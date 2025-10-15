import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'Current123!',
    type: String,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  oldPassword: string

  @ApiProperty({
    description:
      'New password (min 8 chars, must include uppercase, lowercase, number, and special char)',
    example: 'NewSecure123!',
    type: String,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?])[A-Za-z\d@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }
  )
  newPassword: string
}

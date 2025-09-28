import { IsString, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @IsString({ message: 'Token must be a string' })
  token: string

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string
}

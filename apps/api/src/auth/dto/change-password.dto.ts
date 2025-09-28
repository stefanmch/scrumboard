import { IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  currentPassword: string

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string
}

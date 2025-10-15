import { Exclude, Expose } from 'class-transformer'
import { UserRole } from './register.dto'

export class UserResponseDto {
  @Expose()
  id: string

  @Expose()
  email: string

  @Expose()
  name: string

  @Expose()
  role: UserRole

  @Expose()
  emailVerified: boolean

  @Expose()
  isActive: boolean

  @Expose()
  createdAt: Date

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

import { Expose } from 'class-transformer'
import { UserResponseDto } from './user-response.dto'

export class AuthResponseDto {
  @Expose()
  user: UserResponseDto

  @Expose()
  accessToken: string

  @Expose()
  refreshToken: string

  @Expose()
  expiresIn: number

  @Expose()
  tokenType: string = 'Bearer'

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial)
  }
}

export class RefreshResponseDto {
  @Expose()
  accessToken: string

  @Expose()
  refreshToken: string

  @Expose()
  expiresIn: number

  @Expose()
  tokenType: string = 'Bearer'

  constructor(partial: Partial<RefreshResponseDto>) {
    Object.assign(this, partial)
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { SimpleJwtService } from './simple-jwt.service'

export interface JwtPayload {
  sub: string // User ID
  email: string
  roles: string[]
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  tokenId: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

@Injectable()
export class CustomJwtService {
  private readonly simpleJwtService: SimpleJwtService

  constructor() {
    this.simpleJwtService = new SimpleJwtService()
  }

  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    return this.simpleJwtService.generateTokenPair(payload)
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.simpleJwtService.generateAccessToken(payload)
  }

  async generateRefreshToken(userId: string): Promise<string> {
    return this.simpleJwtService.generateRefreshToken(userId)
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.simpleJwtService.verifyAccessToken(token)
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.simpleJwtService.verifyRefreshToken(token)
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    return this.simpleJwtService.extractTokenFromHeader(authHeader)
  }

  decodeToken(token: string): any {
    return this.simpleJwtService.decodeToken(token)
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { SimpleJwtService } from '../services/simple-jwt.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string
    email: string
    roles: string[]
  }
}

@Injectable()
export class SimpleJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: SimpleJwtService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('Access token is required')
    }

    try {
      // Verify the token and extract payload
      const payload = await this.jwtService.verifyAccessToken(token)

      // Attach user information to the request
      request.user = {
        sub: payload.sub,  // Changed from userId to sub to match JwtPayload interface
        email: payload.email,
        roles: payload.roles || [],
      } as any

      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      // Handle different types of token errors
      const errorMessage = error?.message || ''

      if (errorMessage.includes('expired')) {
        throw new UnauthorizedException('Access token has expired')
      }

      if (errorMessage.includes('signature')) {
        throw new UnauthorizedException('Invalid access token signature')
      }

      if (errorMessage.includes('format')) {
        throw new UnauthorizedException('Malformed access token')
      }

      // Generic error for other cases
      throw new UnauthorizedException('Invalid access token')
    }
  }

  /**
   * Extract JWT token from Authorization header
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers?.authorization

    if (!authHeader) {
      return undefined
    }

    // Check for Bearer token format - handle multiple spaces
    const parts = authHeader.trim().split(/\s+/)
    const [type, token] = parts

    if (type !== 'Bearer' || !token) {
      return undefined
    }

    return token
  }
}

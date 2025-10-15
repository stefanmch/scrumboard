import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'

export interface AuthenticatedRequest {
  user: {
    userId: string
    email: string
    roles: string[]
  }
  params?: {
    id?: string
  }
}

@Injectable()
export class UserAuthorizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    const requestedUserId = request.params?.id

    if (!user || !requestedUserId) {
      throw new ForbiddenException('User information not available')
    }

    // Admin users can access any profile
    if (user.roles?.includes(UserRole.ADMIN)) {
      return true
    }

    // Users can only access their own profile
    if (user.userId !== requestedUserId) {
      throw new ForbiddenException('You can only access your own profile')
    }

    return true
  }
}

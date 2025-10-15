import { Injectable, ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler'
import { Request } from 'express'

/**
 * Custom throttler guard that tracks rate limits per user identifier
 * instead of per IP address. This prevents legitimate users from being
 * blocked when sharing IP addresses (e.g., corporate networks, NAT).
 *
 * For login attempts, it uses the email address as the identifier.
 * For authenticated endpoints, it uses the user ID from the JWT payload.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Override the default tracker key generation to use user identifiers
   * instead of IP addresses.
   *
   * @param context - Execution context containing request information
   * @returns User-specific tracker key (email or user ID)
   */
  protected async getTracker(req: Request): Promise<string> {
    // For login endpoint, use email from request body
    if (req.body?.email) {
      return `user:${req.body.email}`
    }

    // For authenticated endpoints, use user ID from JWT payload
    // The JWT is validated by SimpleJwtAuthGuard before this guard runs
    if (req.user && typeof req.user === 'object' && 'sub' in req.user) {
      return `user:${req.user.sub}`
    }

    // Fallback to IP address for endpoints without user context
    // This should rarely happen for auth endpoints
    return req.ip || 'unknown'
  }

  /**
   * Override error handling to provide user-friendly messages
   */
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>()
    const identifier = req.body?.email || req.user?.['sub'] || 'your account'

    throw new ThrottlerException(
      `Too many login attempts for ${identifier}. Please try again later.`
    )
  }
}

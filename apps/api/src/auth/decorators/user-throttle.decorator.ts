import { SetMetadata } from '@nestjs/common'

export const USER_THROTTLE_KEY = 'user_throttle'

/**
 * Configuration for per-user rate limiting
 */
export interface UserThrottleConfig {
  /** Maximum number of requests allowed */
  limit: number
  /** Time window in milliseconds */
  ttl: number
}

/**
 * Decorator to apply per-user rate limiting to an endpoint.
 * Unlike the default @Throttle decorator which tracks by IP,
 * this tracks by user identifier (email or user ID).
 *
 * @example
 * ```typescript
 * @UserThrottle({ limit: 5, ttl: 900000 }) // 5 attempts per 15 minutes
 * @Post('login')
 * async login(@Body() loginDto: LoginDto) {
 *   // ...
 * }
 * ```
 */
export const UserThrottle = (config: UserThrottleConfig) =>
  SetMetadata(USER_THROTTLE_KEY, config)

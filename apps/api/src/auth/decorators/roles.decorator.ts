import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

/**
 * Decorator to specify required roles for a route or controller
 * @param roles - Array of role names required to access the endpoint
 *
 * @example
 * ```typescript
 * @Roles('admin', 'moderator')
 * @Get('admin-only')
 * adminEndpoint() {
 *   return 'Admin access granted';
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

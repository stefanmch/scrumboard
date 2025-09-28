import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (skip JWT authentication)
 * When applied to a route, the JwtAuthGuard will allow access without authentication
 * 
 * @example
 * ```typescript
 * @Public()
 * @Post('login')
 * login(@Body() loginDto: LoginDto) {
 *   return this.authService.login(loginDto);
 * }
 * 
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import { Module } from '@nestjs/common'
import { AuthService } from './services/auth.service'
import { CustomJwtService } from './services/jwt.service'
import { SimpleJwtService } from './services/simple-jwt.service'
import { HashService } from './services/hash.service'
import { AuthController } from './auth.controller'
import { SimpleJwtAuthGuard } from './guards/simple-jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { UserThrottlerGuard } from './guards/user-throttler.guard'

// Simplified auth module without external dependencies that cause issues
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    CustomJwtService,
    SimpleJwtService,
    HashService,
    SimpleJwtAuthGuard,
    RolesGuard,
    UserThrottlerGuard,
  ],
  exports: [
    AuthService,
    CustomJwtService,
    HashService,
    SimpleJwtAuthGuard,
    RolesGuard,
    UserThrottlerGuard,
  ],
})
export class AuthModule {}

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UsersController } from './users.controller'
import { UsersService } from './services/users.service'
import { FileStorageService } from './services/file-storage.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AuthModule, // Import AuthModule for SimpleJwtAuthGuard
  ],
  controllers: [UsersController],
  providers: [UsersService, FileStorageService],
  exports: [UsersService, FileStorageService],
})
export class UsersModule {}

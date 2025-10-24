import { Module } from '@nestjs/common'
import { SprintsService } from './sprints.service'
import { SprintsController } from './sprints.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}

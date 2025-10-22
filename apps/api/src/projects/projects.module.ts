import { Module } from '@nestjs/common'
import { ProjectsService } from './services/projects.service'
import { ProjectsController } from './projects.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

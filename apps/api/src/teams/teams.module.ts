import { Module } from '@nestjs/common'
import { TeamsController } from './teams.controller'
import { TeamsService } from './services/teams.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}

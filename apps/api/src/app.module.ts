import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { StoriesModule } from './stories/stories.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TeamsModule } from './teams/teams.module'
import { ProjectsModule } from './projects/projects.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time to live in milliseconds (60 seconds)
        limit: 60, // Default: 60 requests per minute
      },
    ]),
    // Core modules
    PrismaModule,
    AuthModule,
    StoriesModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { StoriesModule } from './stories/stories.module'
import { AuthModule } from './auth/auth.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

@Module({
  imports: [
    // Core modules
    PrismaModule,
    AuthModule,
    StoriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealthCheck() {
    try {
      // Test database connection
      const userCount = await this.prisma.user.count();
      const taskCount = await this.prisma.task.count();
      const teamCount = await this.prisma.team.count();
      const projectCount = await this.prisma.project.count();

      return {
        status: 'ok',
        database: 'connected',
        data: {
          users: userCount,
          tasks: taskCount,
          teams: teamCount,
          projects: projectCount,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

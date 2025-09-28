import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private retryAttempts = 0;
  private readonly maxRetryAttempts = 5;
  private readonly retryDelay = 2000; // 2 seconds

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'colored',
    });

    this.setupLogging();
    this.setupMiddleware();
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connectWithRetry(): Promise<void> {
    while (this.retryAttempts < this.maxRetryAttempts) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        this.retryAttempts = 0; // Reset on successful connection
        return;
      } catch (error) {
        this.retryAttempts++;
        this.logger.error(
          `Database connection attempt ${this.retryAttempts} failed: ${error.message}`,
        );

        if (this.retryAttempts >= this.maxRetryAttempts) {
          this.logger.error(
            `Failed to connect to database after ${this.maxRetryAttempts} attempts`,
          );
          throw error;
        }

        this.logger.log(`Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private setupLogging(): void {
    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (event: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${event.query}`);
        this.logger.debug(`Params: ${event.params}`);
        this.logger.debug(`Duration: ${event.duration}ms`);
      });
    }

    // Log errors
    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(`Database error: ${event.message}`);
    });

    // Log info messages
    this.$on('info', (event: Prisma.LogEvent) => {
      this.logger.log(`Database info: ${event.message}`);
    });

    // Log warnings
    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(`Database warning: ${event.message}`);
    });
  }

  private setupMiddleware(): void {
    // Soft delete middleware
    this.$use(async (params, next) => {
      // Handle soft deletes for models that have deletedAt field
      if (params.action === 'delete') {
        // Check if model has deletedAt field
        const modelName = params.model;
        if (this.hasDeletedAtField(modelName)) {
          // Change action to update and set deletedAt
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }
      }

      if (params.action === 'deleteMany') {
        const modelName = params.model;
        if (this.hasDeletedAtField(modelName)) {
          // Change action to updateMany and set deletedAt
          params.action = 'updateMany';
          params.args['data'] = { deletedAt: new Date() };
        }
      }

      // Filter out soft deleted records for read operations
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        const modelName = params.model;
        if (this.hasDeletedAtField(modelName)) {
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }
      }

      if (params.action === 'findMany') {
        const modelName = params.model;
        if (this.hasDeletedAtField(modelName)) {
          if (params.args.where) {
            if (params.args.where.deletedAt === undefined) {
              params.args.where.deletedAt = null;
            }
          } else {
            params.args.where = { deletedAt: null };
          }
        }
      }

      return next(params);
    });

    // Performance monitoring middleware
    this.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const end = Date.now();
      const duration = end - start;

      // Log slow queries
      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected: ${params.model}.${params.action} took ${duration}ms`,
        );
      }

      return result;
    });
  }

  private hasDeletedAtField(modelName: string): boolean {
    // List of models that support soft deletes
    const modelsWithSoftDelete = [
      'User',
      'Team',
      'Project',
      'Sprint',
      'Task',
      'Comment',
    ];
    return modelsWithSoftDelete.includes(modelName);
  }

  /**
   * Clean disconnect with error handling
   */
  async disconnect(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${error.message}`);
    }
  }

  /**
   * Health check method
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<{
    connections: number;
    queries: number;
    uptime: number;
  }> {
    try {
      const metrics = await this.$metrics.json();
      return {
        connections: metrics.counters.find((c) => c.key === 'prisma_client_queries_total')?.value || 0,
        queries: metrics.counters.find((c) => c.key === 'prisma_client_queries_total')?.value || 0,
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error(`Failed to get database metrics: ${error.message}`);
      return {
        connections: 0,
        queries: 0,
        uptime: 0,
      };
    }
  }

  /**
   * Execute transaction with retry logic
   */
  async executeTransaction<T>(
    fn: (prisma: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await this.$transaction(fn, options);
      } catch (error) {
        attempt++;

        // Check if error is retryable (connection issues, deadlocks, etc.)
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Transaction attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P2034', // Transaction conflicts
      'P2037', // Too many database connections
      'P1001', // Can't reach database server
      'P1008', // Operations timed out
      'P1017', // Server has closed the connection
    ];

    return retryableCodes.some(code => error.code === code) ||
           error.message?.includes('Connection pool timeout') ||
           error.message?.includes('Connection terminated unexpectedly');
  }

  /**
   * Bulk operations with batching
   */
  async createMany<T extends Record<string, any>>(
    model: string,
    data: T[],
    batchSize: number = 1000,
  ): Promise<{ count: number }> {
    let totalCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const result = await (this as any)[model].createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalCount += result.count;
    }

    return { count: totalCount };
  }
}

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import { PrismaClient, Prisma } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)
  private retryAttempts = 0
  private readonly maxRetryAttempts = 5
  private readonly retryDelay = 2000 // 2 seconds

  constructor() {
    super({
      log: [
        {
          emit: 'stdout',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ],
      // errorFormat removed as it's no longer supported in v5+
    })

    this.setupExtensions()
  }

  async onModuleInit() {
    await this.connectWithRetry()
  }

  async onModuleDestroy() {
    await this.disconnect()
  }

  private async connectWithRetry(): Promise<void> {
    while (this.retryAttempts < this.maxRetryAttempts) {
      try {
        await this.$connect()
        this.logger.log('Successfully connected to database')
        this.retryAttempts = 0 // Reset on successful connection
        return
      } catch (error) {
        this.retryAttempts++
        this.logger.error(
          `Database connection attempt ${this.retryAttempts} failed: ${error.message}`
        )

        if (this.retryAttempts >= this.maxRetryAttempts) {
          this.logger.error(
            `Failed to connect to database after ${this.maxRetryAttempts} attempts`
          )
          throw error
        }

        this.logger.log(`Retrying in ${this.retryDelay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
      }
    }
  }

  private setupExtensions(): void {
    // Note: In Prisma v5+, $on and $use are replaced with $extends
    // For now, we'll use simpler logging through the log configuration
    // and implement soft deletes through service methods rather than global middleware

    // Log performance warning for development
    if (process.env.NODE_ENV === 'development') {
      this.logger.log('Prisma service initialized with stdout logging')
    }
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
    ]
    return modelsWithSoftDelete.includes(modelName)
  }

  /**
   * Clean disconnect with error handling
   */
  async disconnect(): Promise<void> {
    try {
      await this.$disconnect()
      this.logger.log('Database connection closed')
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${error.message}`)
    }
  }

  /**
   * Health check method
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`)
      return false
    }
  }

  /**
   * Get basic database metrics
   * Note: $metrics was removed in Prisma v5+, so we provide basic info
   */
  async getMetrics(): Promise<{
    connections: number
    queries: number
    uptime: number
  }> {
    try {
      // Basic health check to ensure connection is working
      await this.$queryRaw`SELECT 1`

      return {
        connections: 1, // We can't get actual connection count without $metrics
        queries: 0, // Query count tracking would need to be implemented separately
        uptime: process.uptime(),
      }
    } catch (error) {
      this.logger.error(`Failed to get database metrics: ${error.message}`)
      return {
        connections: 0,
        queries: 0,
        uptime: 0,
      }
    }
  }

  /**
   * Execute transaction with retry logic
   */
  async executeTransaction<T>(
    fn: (
      prisma: Omit<PrismaService, '$connect' | '$disconnect' | '$transaction'>
    ) => Promise<T>,
    options?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  ): Promise<T> {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        return await this.$transaction(fn, options)
      } catch (error) {
        attempt++

        // Check if error is retryable (connection issues, deadlocks, etc.)
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          this.logger.warn(
            `Transaction attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        throw error
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript requires it
    throw new Error('Transaction failed after maximum retries')
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'P2034', // Transaction conflicts
      'P2037', // Too many database connections
      'P1001', // Can't reach database server
      'P1008', // Operations timed out
      'P1017', // Server has closed the connection
    ]

    return (
      retryableCodes.some((code) => error.code === code) ||
      error.message?.includes('Connection pool timeout') ||
      error.message?.includes('Connection terminated unexpectedly')
    )
  }

  /**
   * Bulk operations with batching
   */
  async createMany<T extends Record<string, any>>(
    model: string,
    data: T[],
    batchSize: number = 1000
  ): Promise<{ count: number }> {
    let totalCount = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const result = await (this as any)[model].createMany({
        data: batch,
        skipDuplicates: true,
      })
      totalCount += result.count
    }

    return { count: totalCount }
  }

  /**
   * Soft delete utility methods to replace middleware functionality
   * These methods can be used when you need soft delete behavior
   */

  /**
   * Soft delete a record by setting deletedAt timestamp
   */
  async softDelete<T extends Record<string, any>>(
    model: string,
    where: any
  ): Promise<T> {
    const modelName = this.capitalizeFirstLetter(model)
    if (!this.hasDeletedAtField(modelName)) {
      throw new Error(`Model ${modelName} does not support soft deletes`)
    }

    return await (this as any)[model].update({
      where,
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Soft delete multiple records
   */
  async softDeleteMany(model: string, where: any): Promise<{ count: number }> {
    const modelName = this.capitalizeFirstLetter(model)
    if (!this.hasDeletedAtField(modelName)) {
      throw new Error(`Model ${modelName} does not support soft deletes`)
    }

    return await (this as any)[model].updateMany({
      where,
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Find records excluding soft deleted ones
   */
  async findManyExcludingDeleted<T>(
    model: string,
    args: any = {}
  ): Promise<T[]> {
    const modelName = this.capitalizeFirstLetter(model)
    if (this.hasDeletedAtField(modelName)) {
      args.where = {
        ...args.where,
        deletedAt: null,
      }
    }

    return await (this as any)[model].findMany(args)
  }

  /**
   * Find unique record excluding soft deleted ones
   */
  async findUniqueExcludingDeleted<T>(
    model: string,
    args: any
  ): Promise<T | null> {
    const modelName = this.capitalizeFirstLetter(model)
    if (this.hasDeletedAtField(modelName)) {
      args.where = {
        ...args.where,
        deletedAt: null,
      }
    }

    return await (this as any)[model].findUnique(args)
  }

  /**
   * Restore a soft deleted record
   */
  async restore<T>(model: string, where: any): Promise<T> {
    const modelName = this.capitalizeFirstLetter(model)
    if (!this.hasDeletedAtField(modelName)) {
      throw new Error(`Model ${modelName} does not support soft deletes`)
    }

    return await (this as any)[model].update({
      where,
      data: { deletedAt: null },
    })
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
}

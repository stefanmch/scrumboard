import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  const logger = new Logger('Bootstrap')

  // Security headers (basic implementation without helmet)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  })

  // Enhanced CORS configuration
  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ]

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  })

  // Global validation pipe with enhanced options
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validateCustomDecorators: true,
    })
  )

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received, shutting down gracefully')
    app.close()
  })

  process.on('SIGINT', () => {
    logger.log('SIGINT received, shutting down gracefully')
    app.close()
  })

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')

  logger.log(`🚀 Backend API running on http://localhost:${port}`)
  logger.log(`🏥 Health check: http://localhost:${port}/health`)
  logger.log(`📚 API endpoints: http://localhost:${port}/api/v1`)
  logger.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`)
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap')
  logger.error('Failed to start application', error)
  process.exit(1)
})

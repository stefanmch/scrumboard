import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number
    let message: string | object
    let error: string

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
        error = exception.constructor.name
      } else {
        message = (exceptionResponse as any).message || exceptionResponse
        error = (exceptionResponse as any).error || exception.constructor.name
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = 'Internal server error occurred'
      error = 'InternalServerError'

      // Log the unexpected error for debugging
      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined
      )
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    }

    // Log error details (exclude sensitive information in production)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(errorResponse)
      )
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify({ ...errorResponse, stack: undefined })
      )
    }

    response.status(status).json(errorResponse)
  }
}

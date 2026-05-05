import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';

/**
 * Global exception filter that catches all exceptions.
 * Provides consistent error response format across all microservices.
 *
 * Features:
 * - Handles HttpException and non-HttpException errors
 * - Adds timestamp and request path to all error responses
 * - Logs errors for debugging
 * - Returns appropriate HTTP status codes
 *
 * @example
 * // In app.module.ts
 * import { APP_FILTER } from '@nestjs/core';
 * @Module({
 *   providers: [
 *     { provide: APP_FILTER, useClass: AllExceptionsFilter },
 *   ],
 * })
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: HttpStatus;
    let responseBody: any;

    // Check if exception behaves like HttpException (has getStatus and getResponse methods)
    const isHttpException =
      exception &&
      typeof exception === 'object' &&
      'getStatus' in exception &&
      typeof exception.getStatus === 'function' &&
      'getResponse' in exception &&
      typeof exception.getResponse === 'function';

    if (isHttpException) {
      const httpException = exception as HttpException;
      status = httpException.getStatus();
      const exceptionResponse = httpException.getResponse();

      if (typeof exceptionResponse === 'string') {
        responseBody = {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        // HttpException response is already an object with statusCode, message, error
        responseBody = {
          ...(exceptionResponse as object),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      } else {
        responseBody = {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: (exception as { message?: string }).message || httpException.toString(),
        };
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      responseBody = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'Internal server error',
      };

      // Log unexpected errors
      this.error(exception, request);
    }

    // Log 4xx and 5xx errors
    if (status >= 400) {
      this.warn(responseBody, request);
    }

    response.status(status).json(responseBody);
  }

  private error(exception: unknown, request: any): void {
    this.logger.error(
      {
        error: exception,
        path: request.url,
        method: request.method,
      },
      exception instanceof Error ? exception.message : 'Unknown error',
    );
  }

  private warn(responseBody: any, request: any): void {
    this.logger.warn({
      ...responseBody,
      path: request.url,
      method: request.method,
    });
  }
}

import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

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

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const { httpAdapter } = this.httpAdapterHost;

    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status: HttpStatus;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = exceptionResponse;
      } else {
        message = exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // Log unexpected errors
      this.error(exception, request);
    }

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      ...(typeof message === 'object' ? message : { message }),
    };

    // Log 4xx and 5xx errors
    if (status >= 400) {
      this.warn(responseBody, request);
    }

    httpAdapter.reply(response, responseBody, status);
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

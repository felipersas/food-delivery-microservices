import { Injectable, Logger } from '@nestjs/common';
import type { TRPCErrorHandler, OnErrorOptions } from 'nestjs-trpc';

/**
 * tRPC Error Handler for Restaurant Service
 *
 * Centralized error handling for all tRPC procedure errors.
 * Logs error details for debugging and monitoring.
 *
 * Architecture:
 * - Implements TRPCErrorHandler interface from nestjs-trpc
 * - Receives detailed error information on procedure failures
 * - Logs with structured format for log aggregation
 * - Can be extended to send alerts (Sentry, Datadog, etc.)
 */
@Injectable()
export class TrpcErrorHandler implements TRPCErrorHandler {
  private readonly logger = new Logger(TrpcErrorHandler.name);

  /**
   * Handle tRPC procedure errors
   *
   * @param opts - Error details including type, path, error object, and input
   */
  onError(opts: OnErrorOptions): void {
    const { type, path, error, input } = opts;

    // Log structured error for log aggregation
    this.logger.error(
      {
        procedureType: type,
        path: path ?? 'unknown',
        errorCode: error.code,
        message: error.message,
        input: this.sanitizeInput(input),
      },
      error.stack,
    );

    // TODO: Send to external monitoring (Sentry, Datadog, etc.)
    // Example: this.sentryService.captureException(error);
  }

  /**
   * Sanitize input to prevent leaking sensitive data in logs
   * Removes or masks common sensitive fields
   */
  private sanitizeInput(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
      return input;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...input };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { SuccessResponse, ResponseMeta } from '../interfaces/response.interface';

/**
 * Global interceptor that standardizes all success responses
 *
 * Wraps response data in a consistent structure:
 * - { data: T, meta: { timestamp, path, statusCode } }
 *
 * Applied via APP_INTERCEPTOR to ensure all endpoints
 * return standardized responses without manual wrapping
 *
 * @example
 * // Before: { id: 1, name: 'Order 1' }
 * // After:  { data: { id: 1, name: 'Order 1' }, meta: { timestamp: '...', path: '/orders/1', statusCode: 200 } }
 */
@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: this.buildMeta(request, response),
      })),
    );
  }

  /**
   * Build response metadata from request context
   */
  private buildMeta(request: any, response: any): ResponseMeta {
    return {
      timestamp: new Date().toISOString(),
      path: request.url || request.route?.path || '/',
      statusCode: response.statusCode,
    };
  }
}

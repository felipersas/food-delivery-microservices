import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { extractJwtFromHeader } from './jwt.extractor';
import type { UserContext } from './jwt.validator';
import { JwtValidator } from './jwt.validator';
import { IS_PUBLIC_ROUTE } from './public-route.decorator';

/**
 * Authentication interceptor for API Gateway
 *
 * Flow:
 * 1. Check if route is public (skip auth)
 * 2. Extract JWT from Authorization header
 * 3. Validate JWT using shared secret
 * 4. Attach user context to request for downstream forwarding
 *
 * User context is forwarded to microservices via headers:
 * - X-User-ID: User UUID
 * - X-User-Email: User email
 * - X-User-Role: Comma-separated roles
 */
@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(
    private readonly jwtValidator: JwtValidator,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if route is public (e.g., /auth/login, /auth/register)
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    // Headers in NestJS/Express are typically lowercase, but check both cases
    const authHeader = request.headers?.authorization || request.headers?.Authorization;
    const token = extractJwtFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token. Format: "Bearer <token>"');
    }

    // Validate JWT and extract user context
    const userContext: UserContext = this.jwtValidator.validate(token);

    // Attach user context to request for downstream forwarding
    request.user = userContext;

    return next.handle();
  }
}

/**
 * User context headers to forward to microservices
 */
export const USER_CONTEXT_HEADERS = {
  USER_ID: 'X-User-ID',
  EMAIL: 'X-User-Email',
  ROLES: 'X-User-Role',
} as const;

/**
 * Build headers with user context for downstream requests
 */
export function buildUserContextHeaders(
  user: UserContext,
): Record<string, string> {
  return {
    [USER_CONTEXT_HEADERS.USER_ID]: user.userId,
    [USER_CONTEXT_HEADERS.EMAIL]: user.email,
    [USER_CONTEXT_HEADERS.ROLES]: user.roles.join(','),
  };
}

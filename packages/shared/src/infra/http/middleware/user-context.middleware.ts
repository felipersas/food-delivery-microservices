import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { UserContext } from '../../domain/user-context.vo';

/**
 * User Context Middleware
 *
 * Extracts user context from headers propagated by API Gateway
 * and attaches it to the request object for use in guards/controllers.
 *
 * Headers expected (set by API Gateway):
 * - X-User-ID: User UUID
 * - X-User-Email: User email
 * - X-User-Role: Comma-separated roles
 *
 * Usage in main.ts:
 * app.use(UserContextMiddleware);
 */
@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Extract headers from request
      const headers = {
        'x-user-id': req.headers['x-user-id'] as string | undefined,
        'x-user-email': req.headers['x-user-email'] as string | undefined,
        'x-user-role': req.headers['x-user-role'] as string | undefined,
      };

      // Skip if any required header is missing (request not from gateway)
      if (!headers['x-user-id'] || !headers['x-user-email'] || !headers['x-user-role']) {
        next();
        return;
      }

      // Create UserContext from headers
      const userContext = UserContext.fromHeaders(headers);

      // Attach to request for guards/controllers
      req.user = userContext;
    } catch (error) {
      // Invalid headers - log but don't block request
      // (this allows internal service-to-service calls without auth)
      console.error('User context extraction failed:', error);
    }

    next();
  }
}

/**
 * Extend Express Request type to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

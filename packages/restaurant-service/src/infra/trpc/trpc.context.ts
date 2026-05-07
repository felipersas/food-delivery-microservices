import { Injectable } from '@nestjs/common';
import type { TRPCContext, ContextOptions } from 'nestjs-trpc';
import type { CreateTRPCContext } from '@app/trpc-definitions';

/**
 * tRPC Context for Restaurant Service
 *
 * Provides context data for each tRPC procedure call.
 * Extracts user information from request headers set by API Gateway.
 *
 * Architecture:
 * - API Gateway adds x-user-id and x-user-role headers
 * - Context extracts these for use in protected procedures
 * - Enables userId-based filtering and role-based access control
 */
@Injectable()
export class TrpcContext implements TRPCContext {
  /**
   * Create context object for tRPC procedures
   *
   * Headers set by API Gateway/UserContextMiddleware:
   * - x-user-id: User UUID from JWT
   * - x-user-role: User role (admin, customer, restaurant_staff)
   */
  async create(opts: ContextOptions): Promise<CreateTRPCContext & Record<string, unknown>> {
    return {
      userId: opts.req.headers['x-user-id'] as string | undefined,
      userRole: opts.req.headers['x-user-role'] as string | undefined,
    };
  }
}

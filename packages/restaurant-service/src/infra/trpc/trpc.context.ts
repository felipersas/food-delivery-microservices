import { Injectable } from '@nestjs/common';
import { TRPCContext } from 'nestjs-trpc';
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
  constructor(private readonly request: Request) {}

  /**
   * Create context object for tRPC procedures
   *
   * Headers set by API Gateway/UserContextMiddleware:
   * - x-user-id: User UUID from JWT
   * - x-user-role: User role (admin, customer, restaurant_staff)
   */
  async create(): Promise<CreateTRPCContext> {
    return {
      userId: this.request.headers.get('x-user-id') ?? undefined,
      userRole: this.request.headers.get('x-user-role') ?? undefined,
    };
  }
}

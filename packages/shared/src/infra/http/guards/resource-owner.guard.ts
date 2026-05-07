import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserContext } from '../../../domain/user-context.vo';

/**
 * ResourceOwnerGuard decorator options
 */
export interface ResourceOwnerGuardOptions {
  /** Name of the route parameter containing the owner ID (default: 'userId') */
  ownerIdParam?: string;
  /** Custom function to extract owner ID from request (overrides ownerIdParam) */
  extractOwnerId?: (request: any) => string | undefined;
  /** Allow ADMIN role to bypass ownership check (default: true) */
  allowAdmin?: boolean;
}

/**
 * ResourceOwnerGuard metadata key
 */
export const RESOURCE_OWNER_GUARD_OPTIONS = 'RESOURCE_OWNER_GUARD_OPTIONS';

/**
 * Resource Owner Guard
 *
 * Validates that the authenticated user is either:
 * 1. The owner of the resource (userId matches ownerIdParam value)
 * 2. An ADMIN (if allowAdmin is true, default)
 *
 * Usage:
 * @Get('my-profile')
 * @ResourceOwnerGuard()
 * getMyProfile(@CurrentUser() user: UserContext) { ... }
 *
 * @Get('restaurant/:restaurantId')
 * @ResourceOwnerGuard({ ownerIdParam: 'restaurantId', allowAdmin: false })
 * getRestaurant(@CurrentUser() user: UserContext) { ... }
 *
 * @Get('kitchen/:kitchenId/orders')
 * @ResourceOwnerGuard({
 *   extractOwnerId: (req) => req.kitchen.restaurantId
 * })
 * getKitchenOrders(@CurrentUser() user: UserContext) { ... }
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const options = this.getOptions(context);
    const request = context.switchToHttp().getRequest();
    const user: UserContext | undefined = request.user;

    // No user context = not authenticated
    if (!user) {
      return false;
    }

    // Admin bypass (if enabled)
    if (options.allowAdmin !== false && user.isAdmin()) {
      return true;
    }

    // Extract owner ID from request
    const ownerId = this.extractOwnerId(request, options);

    // No owner ID found = deny access
    if (!ownerId) {
      return false;
    }

    // Check if user is the owner
    const isOwner = user.userId === ownerId;

    if (!isOwner) {
      throw new ForbiddenException(
        'Access denied - you do not own this resource',
      );
    }

    return true;
  }

  private getOptions(context: ExecutionContext): ResourceOwnerGuardOptions {
    return (
      this.reflector.get<ResourceOwnerGuardOptions>(
        RESOURCE_OWNER_GUARD_OPTIONS,
        context.getHandler(),
      ) ||
      this.reflector.get<ResourceOwnerGuardOptions>(
        RESOURCE_OWNER_GUARD_OPTIONS,
        context.getClass(),
      ) ||
      {}
    );
  }

  private extractOwnerId(
    request: any,
    options: ResourceOwnerGuardOptions,
  ): string | undefined {
    // Use custom extractor if provided
    if (options.extractOwnerId) {
      return options.extractOwnerId(request);
    }

    // Default: extract from route parameter
    const paramName = options.ownerIdParam || 'userId';
    return request.params?.[paramName];
  }
}

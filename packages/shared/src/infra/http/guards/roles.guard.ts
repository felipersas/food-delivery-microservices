import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleEnum } from '../../../types/user-roles';
import type { UserContext } from '../../../domain/user-context.vo';

/**
 * RolesGuard for microservices
 *
 * Works with user context propagated from API Gateway
 * (no JWT validation needed - gateway already verified)
 *
 * Usage:
 * @Controller('orders')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class OrdersController {
 *   @Get()
 *   @Roles(UserRoleEnum.CUSTOMER)
 *   findAll() { ... }
 * }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleEnum[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // No roles required = public route within service
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (attached by middleware)
    const request = context.switchToHttp().getRequest();
    const user: UserContext | undefined = request.user;

    // No user context = not authenticated
    if (!user) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

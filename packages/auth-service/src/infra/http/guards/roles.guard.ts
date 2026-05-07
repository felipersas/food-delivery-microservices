import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleEnum } from '@app/shared';
import type { UserContext } from '@app/shared';

/**
 * Local RolesGuard for auth-service
 * Re-implementation to avoid cross-package DI issues with Reflector
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleEnum[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserContext | undefined = request.user;

    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

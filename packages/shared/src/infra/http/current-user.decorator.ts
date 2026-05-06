import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { UserContext } from '../../domain/user-context.vo';

/**
 * CurrentUser decorator
 *
 * Extracts user context from request (attached by gateway middleware)
 *
 * Usage:
 * @Get('my-profile')
 * getProfile(@CurrentUser() user: UserContext) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserContext;
  },
);

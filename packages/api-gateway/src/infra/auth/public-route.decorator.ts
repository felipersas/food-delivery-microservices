import { SetMetadata } from '@nestjs/common';

/**
 * Mark route as public (skip authentication)
 *
 * Usage:
 * @PublicRoute()
 * @Post('login')
 * login() { ... }
 *
 * @PublicRoute()
 * @Controller('auth')
 * export class AuthController {
 *   // All routes in this controller are public
 * }
 */
export const IS_PUBLIC_ROUTE = 'isPublicRoute';

export const PublicRoute = () => SetMetadata(IS_PUBLIC_ROUTE, true);

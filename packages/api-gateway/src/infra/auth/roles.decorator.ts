import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '@app/shared';

/**
 * Roles decorator for protecting routes by role
 *
 * Usage:
 * @Roles(UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN)
 * @Get('my-orders')
 * getMyOrders() { ... }
 *
 * @Roles(UserRoleEnum.RESTAURANT)
 * @Post('menu')
 * updateMenu() { ... }
 */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_KEY, roles);

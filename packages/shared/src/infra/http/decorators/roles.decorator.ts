import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../types/user-roles';

/**
 * Roles decorator for specifying required roles
 *
 * Usage:
 * @Roles(UserRoleEnum.CUSTOMER)
 * @Get('my-orders')
 * getMyOrders() { ... }
 *
 * @Roles(UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT)
 * @Patch('menu')
 * updateMenu() { ... }
 */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_KEY, roles);

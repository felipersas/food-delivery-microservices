import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../domain/value-objects/user-role.vo';

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata('roles', roles);

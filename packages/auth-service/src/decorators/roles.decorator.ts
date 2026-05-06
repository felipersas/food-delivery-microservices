import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '@app/shared';

export const Roles = (...roles: UserRoleEnum[]) => SetMetadata('roles', roles);

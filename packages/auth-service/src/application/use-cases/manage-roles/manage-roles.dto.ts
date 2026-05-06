import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

export class ManageRolesDto {
  @ApiProperty({ enum: UserRoleEnum, example: UserRoleEnum.RESTAURANT })
  @IsEnum(UserRoleEnum)
  role!: UserRoleEnum;

  @ApiProperty({ example: 'add', required: false })
  @IsOptional()
  action?: 'add' | 'remove';
}

export type ManageRolesInput = ManageRolesDto;

export interface ManageRolesOutput {
  id: string;
  roles: UserRoleEnum[];
}

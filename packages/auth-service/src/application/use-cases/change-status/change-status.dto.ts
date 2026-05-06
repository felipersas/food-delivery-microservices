import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatusEnum } from '../../../domain/value-objects/user-status.vo';

export class ChangeStatusDto {
  @ApiProperty({ enum: UserStatusEnum, example: UserStatusEnum.ACTIVE })
  @IsEnum(UserStatusEnum)
  status!: UserStatusEnum;

  @ApiProperty({ example: 'Violation of terms', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export type ChangeStatusInput = ChangeStatusDto;

export interface ChangeStatusOutput {
  id: string;
  status: string;
}

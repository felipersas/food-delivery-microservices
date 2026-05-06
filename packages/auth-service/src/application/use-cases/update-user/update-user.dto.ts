import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'newemail@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export type UpdateUserInput = UpdateUserDto;

export interface UpdateUserOutput {
  id: string;
  email: string;
  roles: string[];
  status: string;
}

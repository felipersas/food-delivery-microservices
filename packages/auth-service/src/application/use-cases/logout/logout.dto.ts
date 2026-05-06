import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ example: 'uuid-refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export type LogoutInput = LogoutDto;

export interface LogoutOutput {
  success: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'uuid-refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export type RefreshTokenInput = RefreshTokenDto;

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

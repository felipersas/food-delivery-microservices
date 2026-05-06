import { ApiProperty } from '@nestjs/swagger';

export interface RevokeTokensOutput {
  success: boolean;
  revokedCount: number;
}

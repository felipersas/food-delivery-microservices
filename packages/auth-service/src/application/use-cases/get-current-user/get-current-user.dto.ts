import { ApiProperty } from '@nestjs/swagger';

export interface GetCurrentUserOutput {
  id: string;
  email: string;
  roles: string[];
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

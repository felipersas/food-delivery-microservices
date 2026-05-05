import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCustomerDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

export type GetCustomerInput = string;

export interface GetCustomerOutput {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  totalOrders: number;
  totalSpent: number;
  addresses: Array<{
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
  }>;
  paymentMethods: Array<{
    brand: string;
    token: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

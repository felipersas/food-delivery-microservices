import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCustomerDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

export type GetCustomerInput = string;

export class CustomerAddressResponse {
  @ApiProperty({ description: 'Street name', example: 'Av Paulista' })
  street!: string;

  @ApiProperty({ description: 'House/building number', example: '1000' })
  number!: string;

  @ApiProperty({ description: 'Apartment/suite complement', example: 'Apto 101', required: false })
  complement?: string;

  @ApiProperty({ description: 'City name', example: 'São Paulo' })
  city!: string;

  @ApiProperty({ description: 'State code (2 letters)', example: 'SP' })
  state!: string;

  @ApiProperty({ description: 'Brazilian zip code', example: '01310-100' })
  zipCode!: string;

  @ApiProperty({ description: 'Whether this is the default address', example: true })
  isDefault!: boolean;
}

export class CustomerPaymentMethodResponse {
  @ApiProperty({ description: 'Last 4 digits of card', example: '4242' })
  token!: string;

  @ApiProperty({
    description: 'Payment card brand',
    example: 'visa',
    enum: ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'discover'],
  })
  brand!: string;

  @ApiProperty({ description: 'Expiration month (1-12)', example: 12 })
  expiryMonth!: number;

  @ApiProperty({ description: 'Expiration year', example: 2026 })
  expiryYear!: number;

  @ApiProperty({ description: 'Whether this is the default payment method', example: true })
  isDefault!: boolean;
}

export class GetCustomerOutput {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({ description: 'Customer full name', example: 'João Silva' })
  name!: string;

  @ApiProperty({ description: 'Customer email address', example: 'joao.silva@example.com' })
  email!: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+55119999887766' })
  phone!: string;

  @ApiProperty({
    description: 'Customer account status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;

  @ApiProperty({ description: 'Total number of orders placed', example: 15 })
  totalOrders!: number;

  @ApiProperty({ description: 'Total amount spent across all orders (BRL)', example: 1250.50 })
  totalSpent!: number;

  @ApiProperty({ description: 'Customer delivery addresses', type: [CustomerAddressResponse] })
  addresses!: CustomerAddressResponse[];

  @ApiProperty({ description: 'Saved payment methods', type: [CustomerPaymentMethodResponse] })
  paymentMethods!: CustomerPaymentMethodResponse[];

  @ApiProperty({ description: 'Account creation date', example: '2026-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last profile update date', example: '2026-05-05T14:20:00.000Z' })
  updatedAt!: Date;
}
